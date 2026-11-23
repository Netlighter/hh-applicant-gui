import tempfile
import unittest
from pathlib import Path

from hh_gui.leads import clamp_limit, read_cache, summarize, write_cache


def employer(text: str, **extra):
    message = {"text": text, "author": {"participant_type": "employer", "name": "Анна"}, "created_at": "2026-11-01T10:00:00+0300"}
    message.update(extra)
    return message


class LeadTests(unittest.TestCase):
    def test_ignores_applicant_phone_and_plain_response(self) -> None:
        row = summarize(
            {"id": "1", "state": {"id": "response"}, "vacancy": {"name": "Dev", "employer": {"name": "Acme"}}},
            [{"text": "Мой телефон +7 999 111-22-33", "author": {"participant_type": "applicant"}}],
        )
        self.assertIsNone(row)

    def test_collects_contacts_and_interview(self) -> None:
        row = summarize(
            {
                "id": "2",
                "state": {"id": "invitation"},
                "updated_at": "2026-11-02T12:00:00+0300",
                "vacancy": {
                    "name": "Backend",
                    "alternate_url": "https://hh.ru/vacancy/2",
                    "employer": {"name": "Ромашка"},
                },
            },
            [employer("Приглашаем на собеседование. Телеграм @anna_hr, почта hr@example.com, +7 (495) 123-45-67")],
        )
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row["company"], "Ромашка")
        self.assertIn("Собеседование", row["tags"])
        self.assertIn("Контакты", row["tags"])
        self.assertNotIn("Приглашение", row["tags"])
        self.assertIn("hr@example.com", row["contacts"])
        self.assertTrue(any(item.startswith("+7") for item in row["contacts"]))
        self.assertIn("@anna_hr", row["contacts"])
        self.assertEqual(row["person"], "Анна")

    def test_interview_state_without_contacts(self) -> None:
        row = summarize(
            {"id": "3", "state": {"id": "interview"}, "vacancy": {"name": "QA", "employer": {"name": "Тест"}}},
            [],
        )
        assert row is not None
        self.assertEqual(row["tags"], ["Собеседование"])
        self.assertEqual(row["contacts"], [])

    def test_limit_and_cache_roundtrip(self) -> None:
        self.assertEqual(clamp_limit("150"), 150)
        self.assertEqual(clamp_limit(5000), 1000)
        self.assertEqual(clamp_limit("нет"), 80)
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            folder = root / "profile"
            folder.mkdir()
            saved = write_cache(
                folder,
                {"items": [{"company": "Acme", "tags": ["Контакты"]}], "scanned": 2, "total": 9, "limit": 40},
                root=root / "cache",
            )
            self.assertTrue(saved["savedAt"])
            loaded = read_cache(folder, root=root / "cache")
            self.assertEqual(loaded["scanned"], 2)
            self.assertEqual(loaded["items"][0]["company"], "Acme")
