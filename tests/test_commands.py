import tempfile
import unittest
from pathlib import Path

from hh_gui.commands import CommandError, build_invocation
from hh_gui.paths import PathError, profile_dir


class CommandTests(unittest.TestCase):
    def test_whoami_verbosity_and_default_profile(self) -> None:
        argv, display = build_invocation(
            {"op": "whoami", "globals": {"verbosity": 2, "profile": "."}, "args": []},
            "/bin/hh-applicant-tool",
        )
        self.assertEqual(argv, ["/bin/hh-applicant-tool", "-vv", "whoami"])
        self.assertIn("whoami", display)
        self.assertNotIn("--profile", display)

    def test_authorize_masks_password(self) -> None:
        argv, display = build_invocation(
            {"op": "auth", "args": ["79991234567", "secret-pass"], "globals": {}},
            "hh-applicant-tool",
        )
        self.assertEqual(argv[-3:], ["authorize", "79991234567", "secret-pass"])
        self.assertNotIn("secret-pass", display)
        self.assertIn("***", display)

    def test_config_secret_is_masked(self) -> None:
        _argv, display = build_invocation(
            {
                "op": "config",
                "args": ["openai.default.api_key", "sk-live"],
                "globals": {"useAi": False},
            },
            "hh-applicant-tool",
        )
        self.assertIn("--no-use-ai", display)
        self.assertNotIn("sk-live", display)

    def test_rejects_unknown_operation(self) -> None:
        with self.assertRaises(CommandError):
            build_invocation({"op": "rm", "args": ["-rf"], "globals": {}}, "hh")

    def test_profile_cannot_escape_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = profile_dir(root, "work")
            self.assertEqual(folder, (root / "work").resolve())
            with self.assertRaises(PathError):
                profile_dir(root, "../etc")
            with self.assertRaises(PathError):
                profile_dir(root, "nested/name")


if __name__ == "__main__":
    unittest.main()
