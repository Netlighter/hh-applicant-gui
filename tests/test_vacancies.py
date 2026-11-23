import tempfile
import unittest
from pathlib import Path

from hh_gui.toml_form import write_assignment
from hh_gui.vacancies import (
    cached_score,
    clamp_score_limit,
    parse_score,
    prompt_hash,
    response_count,
    vacancy_brief,
    write_match_cache,
    read_match_cache,
)


class VacancyScoreTests(unittest.TestCase):
    def test_parses_percent_and_caps_brief(self) -> None:
        self.assertEqual(parse_score("Подходит на 82 процента"), 82)
        self.assertEqual(parse_score("150"), 100)
        self.assertIsNone(parse_score("не знаю"))
        brief = vacancy_brief({"name": "Dev", "snippet": {"requirement": "x" * 3000}})
        self.assertEqual(len(brief), 2000)

    def test_reuses_score_for_the_same_prompt(self) -> None:
        digest = prompt_hash("  backend  ")
        previous = [{"id": "1", "promptHash": digest, "score": 77}]
        self.assertEqual(cached_score(previous, "1", digest), 77)
        self.assertIsNone(cached_score(previous, "1", prompt_hash("другое")))

    def test_reads_response_counter(self) -> None:
        self.assertEqual(response_count({"counters": {"responses": 12}}), 12)
        self.assertIsNone(response_count({}))
        self.assertEqual(clamp_score_limit(500), 100)

    def test_cache_roundtrip_and_prompt_assignment(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            folder = root / "profile"
            folder.mkdir()
            saved = write_match_cache(
                folder,
                {"items": [{"id": "9", "score": 80, "company": "Acme"}], "asked": 1, "prompt": "python"},
                root=root / "cache",
            )
            loaded = read_match_cache(folder, root=root / "cache")
            self.assertEqual(loaded["items"][0]["score"], 80)
            self.assertTrue(saved["savedAt"])
        text = write_assignment("", "general", "ai_filter_prompt", "только python\nбез php")
        self.assertIn("ai_filter_prompt", text)
        self.assertIn("только python", text)
