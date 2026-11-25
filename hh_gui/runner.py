from __future__ import annotations

import asyncio
import fcntl
import os
import pty
import select
import signal
import struct
import subprocess
import sys
import termios
import threading
import time
from typing import Any

from fastapi import WebSocket

from .commands import CommandError, build_invocation

MAX_LIVE = 6
MAX_JOBS = 40
MAX_BUFFER = 200_000


class BusyError(RuntimeError):
    pass


def _colorize(text: str) -> str:
    if "\x1b[" in text:
        return text
    painted: list[str] = []
    for line in text.splitlines(keepends=True):
        body = line.rstrip("\r\n")
        ending = line[len(body) :]
        lowered = body.lower()
        if any(word in lowered for word in ("error", "ошиб", "traceback", "exception", "fail", "forbidden")):
            color = "203"
        elif any(word in lowered for word in ("warn", "предупреж", "капч", "captcha", "пропуск")):
            color = "221"
        elif any(word in lowered for word in ("успеш", "отправлен", "приглаш", "собеседован", "опубликован")):
            color = "114"
        elif "http://" in lowered or "https://" in lowered:
            color = "117"
        else:
            painted.append(line)
            continue
        painted.append(f"\x1b[38;5;{color}m{body}\x1b[0m{ending}")
    return "".join(painted)


class Job:
    def __init__(self, job_id: int, display: str, op: str, started: str) -> None:
        self.id = job_id
        self.display = display
        self.op = op
        self.started = started
        self.code: int | None = None
        self.buffer = ""
        self.proc: subprocess.Popen[bytes] | None = None
        self.master: int | None = None
        self.lock = threading.Lock()
        self.cancel = threading.Event()
        self.reader: threading.Thread | None = None
        self.orphan = False

    def summary(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "op": self.op,
            "display": self.display,
            "started": self.started,
            "code": self.code,
        }

    def append(self, text: str) -> None:
        with self.lock:
            self.buffer += text
            if len(self.buffer) > MAX_BUFFER:
                self.buffer = self.buffer[-MAX_BUFFER:]

    def screen(self) -> str:
        with self.lock:
            return self.buffer

    def clear(self) -> None:
        with self.lock:
            self.buffer = ""


class Runner:
    def __init__(self) -> None:
        self._guard = threading.Lock()
        self.jobs: dict[int, Job] = {}
        self._order: list[int] = []
        self.subscribers: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None
        self._seq = 0

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    def running(self) -> bool:
        with self._guard:
            return any(job.code is None for job in self.jobs.values())

    def live_count(self) -> int:
        with self._guard:
            return sum(1 for job in self.jobs.values() if job.code is None)

    def public_jobs(self) -> list[dict[str, Any]]:
        with self._guard:
            return [self.jobs[job_id].summary() for job_id in self._order if job_id in self.jobs]

    def screens(self) -> dict[str, str]:
        with self._guard:
            jobs = list(self.jobs.values())
        return {str(job.id): job.screen() for job in jobs}

    def live_id(self, op: str) -> int | None:
        with self._guard:
            for job_id in reversed(self._order):
                job = self.jobs.get(job_id)
                if job is not None and job.op == op and job.code is None:
                    return job.id
        return None

    def reap(self) -> None:
        with self._guard:
            jobs = list(self.jobs.values())
        for job in jobs:
            if job.code is not None or job.proc is None:
                continue
            reader = job.reader
            if reader is not None and reader.is_alive():
                continue
            code = job.proc.poll()
            if code is None:
                if job.master is None:
                    if not job.orphan:
                        job.orphan = True
                        self._emit_output(
                            job,
                            "\r\nПроцесс ещё идёт, но журнал от него отцепился. Его можно остановить кнопкой «Стоп».\r\n",
                        )
                    continue
                thread = threading.Thread(
                    target=self._read_loop,
                    args=(job,),
                    daemon=True,
                    name=f"hh-gui-pty-{job.id}-again",
                )
                job.reader = thread
                thread.start()
                continue
            self._finish(job, code)

    def run_quiet(self, argv: list[str], timeout: float = 90) -> tuple[int, str]:
        try:
            completed = subprocess.run(
                argv,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            out = (exc.stdout or b"").decode("utf-8", "replace")
            err = (exc.stderr or b"").decode("utf-8", "replace")
            return 124, out + err + "\nПревышено время ожидания"
        text = completed.stdout.decode("utf-8", "replace")
        if completed.returncode != 0:
            text += completed.stderr.decode("utf-8", "replace")
        return completed.returncode, text

    def start(self, argv: list[str], display: str, op: str = "", cols: int = 100, rows: int = 24) -> int:
        with self._guard:
            live = sum(1 for job in self.jobs.values() if job.code is None)
            if live >= MAX_LIVE:
                raise BusyError(f"Уже запущено {MAX_LIVE} команд. Остановите одну, чтобы запустить ещё.")
            self._seq += 1
            job_id = self._seq
            job = Job(job_id, display, op, time.strftime("%H:%M:%S"))
            self.jobs[job_id] = job
            self._order.append(job_id)
        rows = max(1, min(int(rows), 200))
        cols = max(2, min(int(cols), 500))
        master, slave = pty.openpty()
        fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["PYTHONUNBUFFERED"] = "1"
        try:
            proc = subprocess.Popen(
                argv,
                stdin=slave,
                stdout=slave,
                stderr=slave,
                start_new_session=True,
                env=env,
                close_fds=True,
            )
        except Exception:
            os.close(master)
            os.close(slave)
            with self._guard:
                self.jobs.pop(job_id, None)
                if job_id in self._order:
                    self._order.remove(job_id)
            raise
        os.close(slave)
        job.proc = proc
        job.master = master
        banner = (
            f"\r\n\x1b[1;38;5;117m── {job.started}\x1b[0m  "
            f"\x1b[38;5;216m{display}\x1b[0m\r\n"
        )
        self._emit_output(job, banner)
        self._trim()
        self.emit({"type": "started", "job": job.summary(), "jobs": self.public_jobs()})
        thread = threading.Thread(
            target=self._read_loop,
            args=(job,),
            daemon=True,
            name=f"hh-gui-pty-{job_id}",
        )
        job.reader = thread
        thread.start()
        return job_id

    def start_task(self, display: str, op: str, worker: Any) -> int:
        with self._guard:
            live = sum(1 for job in self.jobs.values() if job.code is None)
            if live >= MAX_LIVE:
                raise BusyError(f"Уже запущено {MAX_LIVE} команд. Остановите одну, чтобы запустить ещё.")
            self._seq += 1
            job_id = self._seq
            job = Job(job_id, display, op, time.strftime("%H:%M:%S"))
            self.jobs[job_id] = job
            self._order.append(job_id)
        banner = (
            f"\r\n\x1b[1;38;5;117m── {job.started}\x1b[0m  "
            f"\x1b[38;5;216m{display}\x1b[0m\r\n"
        )
        self._emit_output(job, banner)
        self._trim()
        self.emit({"type": "started", "job": job.summary(), "jobs": self.public_jobs()})

        def run() -> None:
            code = 1
            try:
                result = worker(job)
                code = int(result if result is not None else 0)
            except Exception as exc:
                self._emit_output(job, f"\r\n\x1b[38;5;203m{exc}\x1b[0m\r\n")
                code = 1
            if job.cancel.is_set() and code == 0:
                code = 130
            self._finish(job, code)

        thread = threading.Thread(target=run, daemon=True, name=f"hh-gui-task-{job_id}")
        job.reader = thread
        thread.start()
        return job_id

    def _trim(self) -> None:
        with self._guard:
            finished = [job_id for job_id in self._order if self.jobs[job_id].code is not None]
            overflow = len(self._order) - MAX_JOBS
            for job_id in finished:
                if overflow <= 0:
                    break
                self._order.remove(job_id)
                self.jobs.pop(job_id, None)
                overflow -= 1

    def _read_loop(self, job: Job) -> None:
        proc = job.proc
        master = job.master
        assert proc is not None and master is not None
        while proc.poll() is None:
            try:
                ready, _, _ = select.select([master], [], [], 0.25)
            except (OSError, ValueError):
                time.sleep(0.2)
                continue
            if master not in ready:
                continue
            self._read_chunk(job, master)
        self._drain(job, master)
        code = proc.poll()
        if code is None:
            try:
                code = proc.wait(timeout=1)
            except subprocess.TimeoutExpired:
                code = proc.poll()
        if code is None:
            return
        self._finish(job, code)

    def _finish(self, job: Job, code: int) -> None:
        with self._guard:
            if job.code is not None:
                return
            job.code = int(code)
        if job.code == 0:
            color, label = "114", "код 0"
        elif job.code in {130, -2, 255}:
            color, label = "221", "прервано"
        else:
            color, label = "203", f"код {job.code}"
        self._emit_output(job, f"\r\n\x1b[1;38;5;{color}m── завершено, {label}\x1b[0m\r\n")
        master = job.master
        job.master = None
        if master is not None:
            try:
                os.close(master)
            except OSError:
                pass
        self.emit({"type": "exit", "id": job.id, "op": job.op, "code": job.code, "jobs": self.public_jobs()})
        self._trim()

    def _drain(self, job: Job, master: int) -> None:
        idle = 0
        while idle < 2:
            try:
                ready, _, _ = select.select([master], [], [], 0.05)
            except (OSError, ValueError):
                return
            if master not in ready:
                idle += 1
                continue
            idle = 0
            if not self._read_chunk(job, master):
                return

    def _read_chunk(self, job: Job, master: int) -> bool:
        try:
            chunk = os.read(master, 16384)
        except OSError:
            return False
        if not chunk:
            return False
        self._emit_output(job, chunk.decode("utf-8", "replace"))
        return True

    def _emit_output(self, job: Job, text: str) -> None:
        painted = _colorize(text)
        job.append(painted)
        self.emit({"type": "output", "id": job.id, "data": painted})

    def emit(self, message: dict) -> None:
        loop = self.loop
        if loop is None or loop.is_closed():
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)

    async def broadcast(self, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.subscribers):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.subscribers.discard(ws)

    def _job(self, job_id: object) -> Job | None:
        try:
            key = int(job_id)
        except (TypeError, ValueError):
            return None
        with self._guard:
            return self.jobs.get(key)

    def write(self, job_id: object, data: str) -> None:
        if data == "\x03":
            self.interrupt(job_id)
            return
        job = self._job(job_id)
        if job is None or not data:
            return
        master = job.master
        if master is None:
            return
        try:
            os.write(master, data.encode("utf-8"))
        except OSError:
            pass

    def interrupt(self, job_id: object) -> None:
        job = self._job(job_id)
        if job is not None:
            job.cancel.set()
        self._signal(job_id, signal.SIGINT)

    def stop(self, job_id: object | None = None) -> None:
        if job_id is None:
            with self._guard:
                ids = [job.id for job in self.jobs.values() if job.code is None]
            for item in ids:
                self.stop(item)
            return
        job = self._job(job_id)
        if job is None:
            return
        job.cancel.set()
        proc = job.proc
        if proc is None:
            return
        self._signal(job_id, signal.SIGINT)

        def harder() -> None:
            time.sleep(1.0)
            if proc is not None and proc.poll() is None:
                self._signal(job_id, signal.SIGTERM)
            time.sleep(1.2)
            if proc is not None and proc.poll() is None:
                self._signal(job_id, signal.SIGKILL)

        threading.Thread(target=harder, daemon=True).start()

    def _signal(self, job_id: object, sig: int) -> None:
        job = self._job(job_id)
        if job is None:
            return
        proc = job.proc
        if proc is None or proc.poll() is not None:
            return
        try:
            os.killpg(proc.pid, sig)
        except ProcessLookupError:
            pass

    def resize(self, job_id: object, cols: int, rows: int) -> None:
        job = self._job(job_id)
        if job is None or job.master is None:
            return
        cols = max(2, min(int(cols), 500))
        rows = max(1, min(int(rows), 200))
        try:
            fcntl.ioctl(job.master, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        except OSError:
            pass

    def clear_buffer(self, job_id: object) -> None:
        job = self._job(job_id)
        if job is None:
            return
        job.clear()

    async def handle(self, message: dict, binary: str | None) -> None:
        kind = message.get("type")
        if kind == "start":
            if not binary:
                await self.broadcast(
                    {
                        "type": "error",
                        "message": "hh-applicant-tool не найден. Установите утилиту или укажите путь в параметрах запуска.",
                    }
                )
                return
            try:
                argv, display = build_invocation(message, binary)
                op = message.get("op") if isinstance(message.get("op"), str) else ""
                if message.get("noBump") is True and op == "reply-chats":
                    argv = [sys.executable, "-m", "hh_gui.no_bump", *argv[1:]]
                    display = f"{display}  · без напоминаний"
                cols = int(message.get("cols") or 100)
                rows = int(message.get("rows") or 24)
                self.start(argv, display, op=op, cols=cols, rows=rows)
            except BusyError as exc:
                await self.broadcast({"type": "error", "message": str(exc)})
            except CommandError as exc:
                await self.broadcast({"type": "error", "message": str(exc)})
            except OSError as exc:
                await self.broadcast({"type": "error", "message": f"Не удалось запустить: {exc}"})
            return
        if kind == "input":
            data = message.get("data") or ""
            if isinstance(data, str) and len(data) <= 20_000:
                self.write(message.get("id"), data)
            return
        if kind == "resize":
            try:
                self.resize(message.get("id"), int(message.get("cols") or 80), int(message.get("rows") or 24))
            except (TypeError, ValueError):
                return
            return
        if kind == "stop":
            self.stop(message.get("id"))
            return
        if kind == "clear-buffer":
            self.clear_buffer(message.get("id"))
            await self.broadcast({"type": "cleared", "id": message.get("id")})
