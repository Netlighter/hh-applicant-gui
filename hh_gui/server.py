from __future__ import annotations

import asyncio
import json
import os
import platform
import shutil
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .commands import CommandError, build_invocation
from .daylog import summarize_day
from .leads import LeadError, clamp_limit, collect_leads, read_cache, write_cache
from .vacancies import VacancyError, clamp_score_limit, collect_matches, read_match_cache, write_match_cache
from .paths import (
    PathError,
    create_profile,
    delete_profile,
    iter_profiles,
    load_settings,
    profile_dir,
    resolve_config_root,
    save_settings,
    tool_config_root,
)
from .toml_form import FormError, apply_fields, read_fields, write_assignment
from .runner import BusyError, Job, Runner

STATIC = Path(__file__).resolve().parent / "static"
runner = Runner()
_areas_cache: dict[tuple[str, str], tuple[float, list[dict]]] = {}

QUIET_KEYS = (
    "configDir",
    "profile",
    "apiDelay",
    "baseUrl",
    "userAgent",
    "proxyUrl",
    "captchaLang",
)


async def _pulse_jobs() -> None:
    while True:
        await asyncio.sleep(1.2)
        runner.reap()
        if runner.subscribers:
            await runner.broadcast({"type": "jobs", "jobs": runner.public_jobs()})


@asynccontextmanager
async def lifespan(_app: FastAPI):
    runner.attach_loop(asyncio.get_running_loop())
    pulse = asyncio.create_task(_pulse_jobs())
    try:
        yield
    finally:
        pulse.cancel()
        runner.stop()


app = FastAPI(title="HH Applicant GUI", lifespan=lifespan)


class QuietStatic(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store"
        return response


def error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"message": message}, status_code=status)


def acceptable_binary(path: Path) -> bool:
    return path.is_file() and os.access(path, os.X_OK) and path.name == "hh-applicant-tool"


def resolve_binary() -> tuple[str | None, str | None]:
    settings = load_settings()
    configured = settings.get("binary")
    if isinstance(configured, str) and configured.strip():
        path = Path(configured).expanduser()
        if acceptable_binary(path):
            return str(path), None
        return None, f"По этому пути нет исполняемого файла hh-applicant-tool: {path}"
    sibling = Path(sys.executable).resolve().parent / "hh-applicant-tool"
    if acceptable_binary(sibling):
        return str(sibling), None
    found = shutil.which("hh-applicant-tool")
    if found and acceptable_binary(Path(found)):
        return found, None
    return None, None


def quiet_globals(globals_: dict) -> dict:
    kept = {}
    for key in QUIET_KEYS:
        value = globals_.get(key)
        if isinstance(value, str) and value.strip():
            kept[key] = value.strip()
    kept["verbosity"] = 0
    kept["useAi"] = True
    kept["manualCaptcha"] = False
    kept["handleCaptcha"] = True
    return kept


def friendly_api_error(text: str) -> str:
    lowered = text.lower()
    if any(mark in lowered for mark in ("forbidden", "unauthorized", "bad_authorization", "oauth")):
        return "Нет действующего входа. Откройте раздел «Вход»: токен не найден или сайт его отклонил."
    compact = " ".join(text.split())
    if len(compact) > 360:
        compact = compact[:360] + "…"
    return compact


def extract_json(text: str):
    start = None
    for index, char in enumerate(text):
        if char in "{[":
            start = index
            break
    if start is None:
        raise ValueError(text.strip()[-900:] or "Пустой ответ")
    try:
        return json.loads(text[start:])
    except json.JSONDecodeError as exc:
        raise ValueError(text.strip()[-900:] or "Ответ не JSON") from exc


def trim_me(data: dict) -> dict:
    counters = data.get("counters") if isinstance(data.get("counters"), dict) else {}
    return {
        "id": data.get("id"),
        "firstName": data.get("first_name") or "",
        "lastName": data.get("last_name") or "",
        "middleName": data.get("middle_name") or "",
        "email": data.get("email") or "",
        "phone": data.get("phone") or "",
        "authType": data.get("auth_type") or "",
        "isApplicant": data.get("is_applicant"),
        "counters": {
            "resumes": counters.get("resumes_count", 0),
            "views": counters.get("new_resume_views", 0),
            "unread": counters.get("unread_negotiations", 0),
        },
    }


def trim_resumes(data) -> list[dict]:
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list):
        return []
    resumes = []
    for item in items:
        if not isinstance(item, dict):
            continue
        status = item.get("status") if isinstance(item.get("status"), dict) else {}
        resumes.append(
            {
                "id": str(item.get("id") or ""),
                "title": item.get("title") or "Без названия",
                "status": status.get("name") or status.get("id") or "",
                "statusId": status.get("id") or "",
                "url": item.get("alternate_url") or "",
                "updatedAt": item.get("updated_at") or "",
                "canUpdate": bool(item.get("can_publish_or_update")),
            }
        )
    return resumes


def flatten_areas(nodes, parent: str = "") -> list[dict]:
    found: list[dict] = []
    if not isinstance(nodes, list):
        return found
    for node in nodes:
        if not isinstance(node, dict):
            continue
        name = str(node.get("name") or "")
        trail = f"{parent} · {name}" if parent else name
        found.append({"id": str(node.get("id") or ""), "name": name, "trail": trail})
        found.extend(flatten_areas(node.get("areas") or [], trail))
    return found


def tail_text(path: Path, limit: int = 200_000) -> str:
    if not path.is_file():
        return ""
    size = path.stat().st_size
    with path.open("rb") as handle:
        if size > limit:
            handle.seek(size - limit)
            handle.readline()
        return handle.read().decode("utf-8", "replace")


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def globals_of(body: dict) -> dict:
    globals_ = body.get("globals") or {}
    if not isinstance(globals_, dict):
        raise PathError("Параметры запуска заданы неверно")
    return globals_


def root_from_globals(globals_: dict) -> Path:
    raw = globals_.get("configDir")
    return resolve_config_root(raw if isinstance(raw, str) else None)


async def run_api(globals_: dict, endpoint: str) -> tuple[int, str]:
    binary, binary_error = resolve_binary()
    if not binary:
        raise PathError(binary_error or "hh-applicant-tool не найден")
    argv, _display = build_invocation(
        {"op": "call-api", "args": [endpoint], "globals": quiet_globals(globals_)},
        binary,
    )
    return await asyncio.to_thread(runner.run_quiet, argv, 90)


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-store"})


@app.get("/api/state")
async def state(configDir: str = "") -> JSONResponse:
    try:
        root = resolve_config_root(configDir or None)
    except PathError as exc:
        return error(400, str(exc))
    binary, binary_error = resolve_binary()
    return JSONResponse(
        {
            "binary": binary,
            "binaryError": binary_error,
            "defaultConfigRoot": str(tool_config_root()),
            "configRoot": str(root),
            "profiles": iter_profiles(root),
            "platform": platform.system(),
            "running": runner.running(),
            "version": __version__,
        }
    )


@app.put("/api/settings")
async def put_settings(body: dict) -> JSONResponse:
    binary = body.get("binary")
    settings = load_settings()
    if binary is None or (isinstance(binary, str) and not binary.strip()):
        settings.pop("binary", None)
        save_settings(settings)
        return JSONResponse({"ok": True, "binary": resolve_binary()[0]})
    if not isinstance(binary, str):
        return error(400, "Путь к программе должен быть строкой")
    path = Path(binary).expanduser()
    if not acceptable_binary(path):
        return error(400, "Нужен исполняемый файл с именем hh-applicant-tool")
    settings["binary"] = str(path)
    save_settings(settings)
    return JSONResponse({"ok": True, "binary": str(path)})


@app.get("/api/config")
async def get_config(configDir: str = "", profile: str = ".") -> JSONResponse:
    try:
        folder = profile_dir(resolve_config_root(configDir or None), profile)
    except PathError as exc:
        return error(400, str(exc))
    path = folder / "config.toml"
    text = ""
    if path.is_file():
        text = path.read_text(encoding="utf-8")
    fields, parse_error = parsed_fields(text)
    return JSONResponse({"path": str(path), "text": text, "exists": path.is_file(), "fields": fields, "parseError": parse_error})


def parsed_fields(text: str) -> tuple[dict[str, str], str]:
    try:
        return read_fields(text), ""
    except FormError as exc:
        return read_fields(""), str(exc)


@app.post("/api/config/merge")
async def merge_config(body: dict) -> JSONResponse:
    text = body.get("text")
    fields = body.get("fields")
    if not isinstance(text, str):
        return error(400, "Текст конфига должен быть строкой")
    try:
        merged = apply_fields(text, fields if isinstance(fields, dict) else {})
        read_back, parse_error = parsed_fields(merged)
    except FormError as exc:
        return error(400, str(exc))
    return JSONResponse({"text": merged, "fields": read_back, "parseError": parse_error})


@app.put("/api/config")
async def put_config(body: dict) -> JSONResponse:
    try:
        folder = profile_dir(root_from_globals(globals_of(body)), str(body.get("profile") or "."))
    except PathError as exc:
        return error(400, str(exc))
    text = body.get("text")
    if not isinstance(text, str):
        return error(400, "Текст конфига должен быть строкой")
    if len(text) > 1_500_000:
        return error(400, "Конфиг слишком большой")
    path = folder / "config.toml"
    atomic_write(path, text)
    return JSONResponse({"ok": True, "path": str(path)})


@app.get("/api/logfile")
async def logfile(configDir: str = "", profile: str = ".") -> JSONResponse:
    try:
        folder = profile_dir(resolve_config_root(configDir or None), profile)
    except PathError as exc:
        return error(400, str(exc))
    path = folder / "log.txt"
    return JSONResponse({"path": str(path), "text": tail_text(path), "exists": path.is_file()})


@app.post("/api/profiles")
async def post_profile(body: dict) -> JSONResponse:
    try:
        root = root_from_globals(globals_of(body))
        folder = create_profile(root, str(body.get("name") or ""))
    except FileExistsError:
        return error(409, "Такой профиль уже есть")
    except PathError as exc:
        return error(400, str(exc))
    return JSONResponse({"ok": True, "path": str(folder), "profiles": iter_profiles(root)})


@app.delete("/api/profiles/{name}")
async def remove_profile(name: str, body: dict) -> JSONResponse:
    if body.get("confirm") is not True:
        return error(400, "Удаление нужно подтвердить")
    try:
        root = root_from_globals(globals_of(body))
        delete_profile(root, name)
    except PathError as exc:
        return error(400, str(exc))
    return JSONResponse({"ok": True, "profiles": iter_profiles(root)})


@app.post("/api/preview")
async def preview(body: dict) -> JSONResponse:
    binary, _error = resolve_binary()
    try:
        _argv, display = build_invocation(body, binary or "hh-applicant-tool")
    except CommandError as exc:
        return error(400, str(exc))
    return JSONResponse({"display": display})


@app.post("/api/snapshot")
async def snapshot(body: dict) -> JSONResponse:
    try:
        globals_ = globals_of(body)
        me_code, me_text = await run_api(globals_, "/me")
        resume_code, resume_text = await run_api(globals_, "/resumes/mine")
    except BusyError:
        return error(409, "Сейчас выполняется другая команда")
    except (PathError, CommandError) as exc:
        return error(400, str(exc))
    me = None
    resumes: list[dict] = []
    messages: list[str] = []

    def add_message(text: str) -> None:
        friendly = friendly_api_error(text)
        if friendly and friendly not in messages:
            messages.append(friendly)

    if me_code == 0:
        try:
            payload = extract_json(me_text)
            me = trim_me(payload) if isinstance(payload, dict) else None
        except ValueError as exc:
            add_message(str(exc))
    else:
        add_message(me_text.strip() or "Не удалось прочитать профиль")
    if resume_code == 0:
        try:
            resumes = trim_resumes(extract_json(resume_text))
        except ValueError as exc:
            add_message(str(exc))
    else:
        add_message(resume_text.strip() or "Не удалось прочитать резюме")
    return JSONResponse(
        {
            "me": me,
            "resumes": resumes,
            "message": "\n".join(item for item in messages if item),
            "authorized": me is not None,
        }
    )


@app.post("/api/areas")
async def areas(body: dict) -> JSONResponse:
    try:
        globals_ = globals_of(body)
        query = body.get("query")
        if not isinstance(query, str):
            query = ""
        key = (
            str(globals_.get("configDir") or ""),
            str(globals_.get("profile") or "."),
        )
        cached = _areas_cache.get(key)
        if cached is None or time.time() - cached[0] > 600:
            code, text = await run_api(globals_, "/areas")
            if code != 0:
                return error(400, text.strip()[-700:] or "Справочник регионов недоступен")
            flat = flatten_areas(extract_json(text))
            _areas_cache[key] = (time.time(), flat)
        flat = _areas_cache[key][1]
    except BusyError:
        return error(409, "Сейчас выполняется другая команда")
    except (PathError, CommandError, ValueError) as exc:
        return error(400, str(exc))
    needle = query.strip().lower()
    if not needle:
        return JSONResponse({"items": flat[:30]})
    hits = [
        item
        for item in flat
        if needle in item["trail"].lower() or item["id"] == needle
    ]
    return JSONResponse({"items": hits[:40]})


def _profile_folder(config_dir: str, profile: str) -> Path:
    return profile_dir(resolve_config_root(config_dir or None), profile)


@app.get("/api/chat-leads")
async def chat_leads_cache(configDir: str = "", profile: str = ".") -> JSONResponse:
    try:
        folder = _profile_folder(configDir, profile)
    except PathError as exc:
        return error(400, str(exc))
    return JSONResponse(read_cache(folder))


@app.get("/api/today")
async def today(configDir: str = "", profile: str = ".") -> JSONResponse:
    try:
        folder = _profile_folder(configDir, profile)
    except PathError as exc:
        return error(400, str(exc))
    return JSONResponse(summarize_day(folder / "log.txt"))


@app.post("/api/chat-leads")
async def chat_leads(body: dict) -> JSONResponse:
    try:
        globals_ = globals_of(body)
        folder = profile_dir(root_from_globals(globals_), str(globals_.get("profile") or "."))
        limit = clamp_limit(body.get("limit") or 80)
    except (PathError, CommandError, ValueError) as exc:
        return error(400, str(exc))
    existing = runner.live_id("chat-leads")
    if existing is not None:
        return JSONResponse({"id": existing, "already": True})

    profile_name = str(globals_.get("profile") or ".")
    config_dir = globals_.get("configDir") if isinstance(globals_.get("configDir"), str) else ""

    def worker(job: Job) -> int:
        def progress(text: str) -> None:
            runner._emit_output(job, text + "\r\n")

        runner._emit_output(
            job,
            "Читаю переписки. Контакты попадут в таблицу и не пишутся в журнал.\r\n",
        )
        try:
            result = collect_leads(
                globals_,
                limit,
                progress=progress,
                cancelled=job.cancel.is_set,
            )
        except LeadError as exc:
            runner._emit_output(job, f"\x1b[38;5;203m{exc}\x1b[0m\r\n")
            return 1
        try:
            if result.get("stopped") and not result.get("scanned"):
                saved = read_cache(folder)
            else:
                saved = write_cache(folder, result)
        except OSError as exc:
            saved = {**result, "savedAt": None}
            runner._emit_output(job, f"Таблица собрана, но не сохранилась: {exc}\r\n")
        found = len(saved.get("items") or [])
        runner._emit_output(
            job,
            f"В таблице {found}. Просмотрено {saved.get('scanned')} из {saved.get('total')}.\r\n",
        )
        runner.emit(
            {
                "type": "leads",
                "profile": profile_name,
                "configDir": config_dir,
                "result": saved,
            }
        )
        return 130 if result.get("stopped") else 0

    try:
        job_id = runner.start_task(f"Прогон контактов, лимит {limit}", "chat-leads", worker)
    except BusyError as exc:
        return error(409, str(exc))
    return JSONResponse({"id": job_id, "already": False})


@app.get("/api/vacancies")
async def vacancy_cache(configDir: str = "", profile: str = ".") -> JSONResponse:
    try:
        folder = _profile_folder(configDir, profile)
    except PathError as exc:
        return error(400, str(exc))
    return JSONResponse(read_match_cache(folder))


@app.post("/api/vacancies")
async def vacancy_score(body: dict) -> JSONResponse:
    try:
        globals_ = globals_of(body)
        folder = profile_dir(root_from_globals(globals_), str(globals_.get("profile") or "."))
        search = body.get("search") if isinstance(body.get("search"), dict) else {}
        prompt = body.get("prompt") if isinstance(body.get("prompt"), str) else ""
        limit = clamp_score_limit(body.get("limit") or 20)
    except (PathError, CommandError, ValueError) as exc:
        return error(400, str(exc))
    existing = runner.live_id("vacancy-score")
    if existing is not None:
        return JSONResponse({"id": existing, "already": True})
    profile_name = str(globals_.get("profile") or ".")
    config_dir = globals_.get("configDir") if isinstance(globals_.get("configDir"), str) else ""
    previous = read_match_cache(folder).get("items") or []

    def worker(job: Job) -> int:
        def progress(text: str) -> None:
            runner._emit_output(job, text + "\r\n")

        runner._emit_output(
            job,
            "Ищу вакансии и спрашиваю модель по одной. Пауза между запросами берётся из конфига. Уже оцененные с этим промптом пропускаются.\r\n",
        )
        try:
            result = collect_matches(
                globals_,
                search,
                prompt,
                limit,
                progress=progress,
                cancelled=job.cancel.is_set,
                previous=previous if isinstance(previous, list) else None,
            )
        except VacancyError as exc:
            runner._emit_output(job, f"\x1b[38;5;203m{exc}\x1b[0m\r\n")
            return 1
        try:
            if result.get("stopped") and not result.get("scanned"):
                saved = read_match_cache(folder)
            else:
                saved = write_match_cache(folder, result)
        except OSError as exc:
            saved = {**result, "savedAt": None}
            runner._emit_output(job, f"Таблица собрана, но не сохранилась: {exc}\r\n")
        runner._emit_output(
            job,
            f"В таблице {len(saved.get('items') or [])}. Новых запросов к модели: {saved.get('asked', result.get('asked'))}. Повторно использовано: {saved.get('reused', result.get('reused'))}.\r\n",
        )
        runner.emit(
            {
                "type": "vacancies",
                "profile": profile_name,
                "configDir": config_dir,
                "result": saved,
            }
        )
        return 130 if result.get("stopped") else 0

    try:
        job_id = runner.start_task(f"Оценка вакансий, лимит {limit}", "vacancy-score", worker)
    except BusyError as exc:
        return error(409, str(exc))
    return JSONResponse({"id": job_id, "already": False})


@app.post("/api/config/prompt")
async def put_prompt(body: dict) -> JSONResponse:
    try:
        globals_ = globals_of(body)
        folder = profile_dir(root_from_globals(globals_), str(globals_.get("profile") or "."))
    except PathError as exc:
        return error(400, str(exc))
    prompt = body.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return error(400, "Промпт пустой")
    if len(prompt) > 4000:
        return error(400, "Промпт длиннее 4000 символов")
    path = folder / "config.toml"
    current = path.read_text(encoding="utf-8") if path.is_file() else ""
    try:
        merged = write_assignment(current, "general", "ai_filter_prompt", prompt.strip())
    except FormError as exc:
        return error(400, str(exc))
    atomic_write(path, merged)
    return JSONResponse({"ok": True})


@app.websocket("/ws")
async def websocket(ws: WebSocket) -> None:
    await ws.accept()
    runner.subscribers.add(ws)
    binary, _error = resolve_binary()
    await ws.send_json(
        {
            "type": "hello",
            "running": runner.running(),
            "jobs": runner.public_jobs(),
            "screens": runner.screens(),
            "binary": binary,
        }
    )
    try:
        while True:
            message = await ws.receive_json()
            if not isinstance(message, dict):
                continue
            binary, _error = resolve_binary()
            await runner.handle(message, binary)
    except WebSocketDisconnect:
        runner.subscribers.discard(ws)
    except Exception:
        runner.subscribers.discard(ws)


app.mount("/static", QuietStatic(directory=STATIC), name="static")
