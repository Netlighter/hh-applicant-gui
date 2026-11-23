import tempfile
import unittest
from pathlib import Path

from hh_gui.daylog import summarize_day


class DayLogTests(unittest.TestCase):
    def test_counts_only_today_and_real_sends(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "log.txt"
            path.write_text(
                "\n".join(
                    [
                        "2026-11-17 10:00:00,000 - INFO - Отправили отклик на вакансию без теста: https://hh.ru/vacancy/1",
                        "2026-11-18 10:00:00,000 - INFO - Отправили отклик на вакансию без теста: https://hh.ru/vacancy/2",
                        "2026-11-18 10:01:00,000 - INFO - Отправили отклик на вакансию с тестом: https://hh.ru/vacancy/3",
                        "2026-11-18 10:02:00,000 - DEBUG - dry-run: ответ в чат #4: нет",
                        "2026-11-18 10:03:00,000 - DEBUG - Отвечаем в чат: 5",
                        "2026-11-18 10:04:00,000 - DEBUG - Отвечаем в чат: 6",
                    ]
                ),
                encoding="utf-8",
            )
            summary = summarize_day(path, "2026-11-18")
            self.assertEqual(summary["applies"], 2)
            self.assertEqual(summary["replies"], 2)
            self.assertEqual(summary["date"], "2026-11-18")
