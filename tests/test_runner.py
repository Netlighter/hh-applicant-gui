import threading
import time
import unittest

from hh_gui.runner import Runner


class RunnerTaskTests(unittest.TestCase):
    def test_background_task_finishes_and_stays_listed(self) -> None:
        runner = Runner()
        started = threading.Event()
        release = threading.Event()

        def worker(job):
            started.set()
            release.wait(2)
            return 0

        job_id = runner.start_task("Сбор чатов, лимит 40", "chat-leads", worker)
        self.assertTrue(started.wait(2))
        self.assertIsNone(runner.jobs[job_id].code)
        self.assertEqual(runner.live_id("chat-leads"), job_id)
        release.set()
        deadline = time.time() + 3
        while time.time() < deadline and runner.jobs[job_id].code is None:
            time.sleep(0.02)
        self.assertEqual(runner.jobs[job_id].code, 0)
        self.assertIsNone(runner.live_id("chat-leads"))
        self.assertIn(job_id, {job["id"] for job in runner.public_jobs()})

    def test_stop_cancels_background_task(self) -> None:
        runner = Runner()

        def worker(job):
            for _ in range(40):
                if job.cancel.is_set():
                    return 130
                time.sleep(0.05)
            return 0

        job_id = runner.start_task("Сбор чатов", "chat-leads", worker)
        runner.stop(job_id)
        deadline = time.time() + 3
        while time.time() < deadline and runner.jobs[job_id].code is None:
            time.sleep(0.02)
        self.assertEqual(runner.jobs[job_id].code, 130)
