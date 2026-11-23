from __future__ import annotations

import shlex
from pathlib import Path

OPS = {
    "__help__": None,
    "authorize": "authorize",
    "logout": "logout",
    "whoami": "whoami",
    "list-resumes": "list-resumes",
    "update-resumes": "update-resumes",
    "apply-vacancies": "apply-vacancies",
    "reply-chats": "reply-chats",
    "clear-negotiations": "clear-negotiations",
    "call-api": "call-api",
    "config": "config",
    "log": "log",
    "check-updates": "check-updates",
}

ALIASES = {
    "auth": "authorize",
    "login": "authorize",
    "authenticate": "authorize",
    "exit": "logout",
    "id": "whoami",
    "ls-resumes": "list-resumes",
    "resumes": "list-resumes",
    "apply": "apply-vacancies",
    "respond-chats": "reply-chats",
    "api": "call-api",
}

GLOBAL_STRINGS = (
    ("configDir", "--config-dir"),
    ("profile", "--profile"),
    ("apiDelay", "--api-delay"),
    ("baseUrl", "--base-url"),
    ("userAgent", "--user-agent"),
    ("proxyUrl", "--proxy-url"),
    ("openaiProxy", "--openai-proxy"),
    ("openaiDelay", "--openai-delay"),
    ("openaiTimeout", "--openai-timeout"),
    ("openaiConnectTimeout", "--openai-connect-timeout"),
    ("captchaLang", "--captcha-lang"),
)

SECRET_PARTS = ("password", "api_key", "secret", "token")


class CommandError(ValueError):
    pass


def normalize_op(op: object) -> str:
    if not isinstance(op, str) or not op.strip():
        raise CommandError("Не указана команда")
    name = op.strip()
    if name in OPS:
        return name
    if name in ALIASES:
        return ALIASES[name]
    raise CommandError(f"Неизвестная команда: {name}")


def _text(value: object, label: str, limit: int = 100_000) -> str:
    if not isinstance(value, str):
        raise CommandError(f"{label} должно быть строкой")
    if "\x00" in value:
        raise CommandError(f"{label} содержит пустой символ")
    if len(value) > limit:
        raise CommandError(f"{label} слишком длинное")
    return value


def build_invocation(payload: dict, binary: str) -> tuple[list[str], str]:
    if not isinstance(payload, dict):
        raise CommandError("Некорректный запрос")
    op = normalize_op(payload.get("op"))
    globals_ = payload.get("globals") or {}
    if not isinstance(globals_, dict):
        raise CommandError("Параметры запуска заданы неверно")
    raw_args = payload.get("args") or []
    if not isinstance(raw_args, list):
        raise CommandError("Аргументы должны быть списком")
    if len(raw_args) > 200:
        raise CommandError("Слишком много аргументов")

    argv = [binary]
    try:
        verbosity = int(globals_.get("verbosity") or 0)
    except (TypeError, ValueError) as exc:
        raise CommandError("Подробность вывода должна быть числом") from exc
    if verbosity < 0 or verbosity > 3:
        raise CommandError("Подробность вывода: от 0 до 3")
    if verbosity:
        argv.append("-" + ("v" * verbosity))

    for key, flag in GLOBAL_STRINGS:
        raw = globals_.get(key)
        if raw is None or raw is False:
            continue
        text = _text(raw if isinstance(raw, str) else str(raw), key).strip()
        if not text:
            continue
        if key == "profile" and text in {".", "default"}:
            continue
        if key == "configDir":
            folder = Path(text).expanduser()
            if not folder.is_absolute():
                raise CommandError("Каталог конфигов должен быть абсолютным путём")
            text = str(folder)
        if key == "captchaLang":
            text = text.upper()
            if text not in {"RU", "EN"}:
                raise CommandError("Язык капчи: RU или EN")
        argv.extend([flag, text])

    if globals_.get("useAi") is False:
        argv.append("--no-use-ai")
    if globals_.get("manualCaptcha") is True:
        argv.append("--manual-captcha")
    if globals_.get("handleCaptcha") is False:
        argv.append("--no-handle-captcha")

    if op == "__help__":
        argv.append("-h")
    else:
        argv.append(OPS[op])

    args: list[str] = []
    for index, item in enumerate(raw_args):
        args.append(_text(item, f"аргумент {index + 1}"))
    argv.extend(args)

    masked = list(argv)
    if op == "authorize":
        op_index = masked.index("authorize")
        if len(masked) - op_index - 1 >= 2:
            masked[op_index + 2] = "***"
    if op == "config" and len(args) >= 2 and not args[0].startswith("-"):
        if any(part in args[0].lower() for part in SECRET_PARTS):
            masked[-1] = "***"

    display = " ".join(shlex.quote(part) for part in masked)
    return argv, display
