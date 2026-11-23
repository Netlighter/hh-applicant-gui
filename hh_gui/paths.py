from __future__ import annotations

import json
import os
import platform
import re
import shutil
from pathlib import Path

PROFILE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,40}")


class PathError(ValueError):
    pass


def _platform_config_base() -> Path:
    system = platform.system()
    if system == "Windows":
        return Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support"
    return Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))


def tool_config_root() -> Path:
    return _platform_config_base() / "hh-applicant-tool"


def gui_config_dir() -> Path:
    path = _platform_config_base() / "hh-applicant-gui"
    path.mkdir(parents=True, exist_ok=True)
    return path


def settings_file() -> Path:
    return gui_config_dir() / "settings.json"


def load_settings() -> dict:
    path = settings_file()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def save_settings(data: dict) -> None:
    settings_file().write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def resolve_config_root(raw: str | None) -> Path:
    if raw is None or str(raw).strip() == "":
        return tool_config_root()
    path = Path(str(raw)).expanduser()
    if not path.is_absolute():
        raise PathError("Каталог конфигов должен быть абсолютным путём")
    return path


def profile_dir(root: Path, profile: str | None) -> Path:
    base = root.expanduser().resolve()
    name = (profile or ".").strip() or "."
    if name in {".", "default"}:
        return base
    if not PROFILE_NAME.fullmatch(name):
        raise PathError("Имя профиля: латиница, цифры, точка, _ и -")
    path = (base / name).resolve()
    if path.parent != base:
        raise PathError("Профиль должен лежать прямо в каталоге данных")
    return path


def iter_profiles(root: Path) -> list[dict]:
    profiles = [_describe(root, ".", "Основной")]
    if not root.is_dir():
        return profiles
    children = sorted(
        (path for path in root.iterdir() if path.is_dir() and not path.name.startswith(".")),
        key=lambda path: path.name.lower(),
    )
    for child in children:
        if PROFILE_NAME.fullmatch(child.name):
            profiles.append(_describe(root, child.name, child.name))
    return profiles


def _describe(root: Path, profile: str, title: str) -> dict:
    folder = root if profile == "." else root / profile
    config = folder / "config.toml"
    token = folder / "token.json"
    cookies = folder / "cookies.txt"
    log = folder / "log.txt"
    has_token = False
    if token.is_file():
        try:
            has_token = token.stat().st_size > 2
        except OSError:
            has_token = False
    log_bytes = 0
    if log.is_file():
        try:
            log_bytes = log.stat().st_size
        except OSError:
            log_bytes = 0
    return {
        "id": profile,
        "name": title,
        "hasConfig": config.is_file(),
        "hasToken": has_token,
        "hasCookies": cookies.is_file(),
        "logBytes": log_bytes,
    }


def create_profile(root: Path, name: str) -> Path:
    folder = profile_dir(root, name)
    if folder == root.expanduser().resolve():
        raise PathError("Основной профиль уже есть")
    folder.mkdir(parents=True, exist_ok=False)
    return folder


def delete_profile(root: Path, name: str) -> None:
    folder = profile_dir(root, name)
    base = root.expanduser().resolve()
    if folder == base:
        raise PathError("Основной профиль удалить нельзя")
    if not folder.is_dir():
        raise PathError("Профиль не найден")
    shutil.rmtree(folder)
