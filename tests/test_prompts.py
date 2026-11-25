import unittest

from hh_gui.prompts import apply_edits, read_group
from hh_gui.toml_form import clear_assignment, write_assignment


class PromptTests(unittest.TestCase):
    def test_missing_key_shows_system_text(self) -> None:
        payload = read_group("[general]\ncaptcha_lang = \"RU\"\n", "apply")
        letter = next(tab for tab in payload["tabs"] if tab["id"] == "letter")
        system = next(field for field in letter["fields"] if field["key"] == "system_prompt")
        self.assertFalse(system["custom"])
        self.assertIn("сопроводительные письма", system["value"])
        self.assertEqual(system["value"], system["default"])

    def test_custom_text_roundtrip_and_reset(self) -> None:
        source = "# шапка\n[general]\ncaptcha_lang = \"RU\"\n"
        saved = apply_edits(source, [{
            "section": "openai.vacancy_filter",
            "key": "system_prompt",
            "value": "Отвечай только нет.",
        }])
        self.assertIn("# шапка", saved)
        self.assertIn('captcha_lang = "RU"', saved)
        self.assertIn('system_prompt = "Отвечай только нет."', saved)
        payload = read_group(saved, "apply")
        field = next(item for item in next(tab for tab in payload["tabs"] if tab["id"] == "filter")["fields"] if item["key"] == "system_prompt")
        self.assertTrue(field["custom"])
        self.assertEqual(field["value"], "Отвечай только нет.")
        reset = apply_edits(saved, [{
            "section": "openai.vacancy_filter",
            "key": "system_prompt",
            "value": field["default"],
        }])
        self.assertNotIn("system_prompt", reset)
        self.assertIn('captcha_lang = "RU"', reset)
        again = read_group(reset, "apply")
        restored = next(item for item in next(tab for tab in again["tabs"] if tab["id"] == "filter")["fields"] if item["key"] == "system_prompt")
        self.assertFalse(restored["custom"])

    def test_clear_keeps_other_keys(self) -> None:
        source = write_assignment("[general]\nai_filter_prompt = \"своё\"\ncaptcha_lang = \"RU\"\n", "general", "cover_letter_prompt", "письмо")
        cleared = clear_assignment(source, "general", "ai_filter_prompt")
        self.assertNotIn("ai_filter_prompt", cleared)
        self.assertIn("cover_letter_prompt", cleared)
        self.assertIn('captcha_lang = "RU"', cleared)


if __name__ == "__main__":
    unittest.main()
