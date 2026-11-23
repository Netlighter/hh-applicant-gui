import unittest

from hh_gui.toml_form import FormError, apply_fields, read_fields


class TomlFormTests(unittest.TestCase):
    def test_preserves_comments_and_other_keys(self) -> None:
        source = """# шапка
[general]
# язык капчи
captcha_lang = "EN"
user_agent = "old"

[openai.default]
base_url = "http://old/v1"
# не трогать
temperature = 0.2
"""
        merged = apply_fields(source, {
            "openai.default.base_url": "http://127.0.0.1:11434/v1",
            "openai.default.model": "qwen3-vl:8b",
            "openai.default.api_key": "",
            "general.captcha_lang": "RU",
        })
        self.assertIn("# шапка", merged)
        self.assertIn("# язык капчи", merged)
        self.assertIn("# не трогать", merged)
        self.assertIn('user_agent = "old"', merged)
        self.assertIn('captcha_lang = "RU"', merged)
        self.assertIn('base_url = "http://127.0.0.1:11434/v1"', merged)
        self.assertIn('model = "qwen3-vl:8b"', merged)
        self.assertNotIn("http://old/v1", merged)
        fields = read_fields(merged)
        self.assertEqual(fields["openai.default.model"], "qwen3-vl:8b")
        self.assertEqual(fields["openai.default.temperature"], "0.2")
        self.assertEqual(fields["general.captcha_lang"], "RU")

    def test_creates_missing_section(self) -> None:
        merged = apply_fields("", {
            "smtp.host": "smtp.example.com",
            "smtp.port": "465",
            "smtp.ssl": "true",
        })
        self.assertIn("[smtp]", merged)
        self.assertIn('host = "smtp.example.com"', merged)
        self.assertIn("port = 465", merged)
        self.assertIn("ssl = true", merged)

    def test_rejects_bad_number(self) -> None:
        with self.assertRaises(FormError):
            apply_fields("", {"openai.default.delay": "много"})
