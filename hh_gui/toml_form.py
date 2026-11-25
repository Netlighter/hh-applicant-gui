from __future__ import annotations

import re

import tomllib

# Ключи, которые форма пишет обратно в файл, не трогая комментарии и прочие строки.
SCHEMA: dict[str, dict[str, str]] = {
    "openai.default": {
        "base_url": "str",
        "api_key": "str",
        "model": "str",
        "proxy_url": "str",
        "delay": "num",
        "timeout": "num",
        "connect_timeout": "num",
        "temperature": "num",
        "max_completion_tokens": "num",
        "max_retries": "num",
    },
    "openai.captcha": {
        "base_url": "str",
        "api_key": "str",
        "model": "str",
    },
    "general": {
        "base_url": "str",
        "captcha_lang": "str",
        "proxy_url": "str",
        "user_agent": "str",
    },
    "smtp": {
        "host": "str",
        "port": "num",
        "user": "str",
        "password": "str",
        "from": "str",
        "ssl": "bool",
        "starttls": "bool",
    },
    "api_client": {
        "base_url": "str",
        "delay": "num",
        "max_retries": "num",
    },
}


class FormError(ValueError):
    pass


def field_names() -> list[str]:
    names: list[str] = []
    for section, keys in SCHEMA.items():
        for key in keys:
            names.append(f"{section}.{key}")
    return names


def read_fields(text: str) -> dict[str, str]:
    fields = {name: "" for name in field_names()}
    if not text.strip():
        return fields
    try:
        data = tomllib.loads(text)
    except tomllib.TOMLDecodeError as exc:
        raise FormError(f"config.toml не читается: {exc}") from exc
    if not isinstance(data, dict):
        return fields
    for section, keys in SCHEMA.items():
        node: object = data
        for part in section.split("."):
            if not isinstance(node, dict):
                node = {}
                break
            node = node.get(part, {})
        if not isinstance(node, dict):
            continue
        for key in keys:
            if key in node and node[key] is not None:
                fields[f"{section}.{key}"] = _stringify(node[key])
    return fields


def apply_fields(text: str, fields: dict) -> str:
    if not isinstance(fields, dict):
        raise FormError("Поля формы заданы неверно")
    grouped: dict[str, dict[str, str | None]] = {}
    for name, kind in _flat_schema().items():
        if name not in fields:
            continue
        raw = fields[name]
        if raw is None:
            raw = ""
        if not isinstance(raw, str):
            raise FormError(f"{name} должно быть строкой")
        section, key = name.rsplit(".", 1)
        grouped.setdefault(section, {})[key] = _format(kind, raw.strip(), name)
    if text and not text.endswith("\n"):
        text += "\n"
    lines = text.splitlines(keepends=True)
    for section, values in grouped.items():
        lines = _upsert_section(lines, section, values)
    rendered = "".join(lines)
    if rendered and not rendered.endswith("\n"):
        rendered += "\n"
    return rendered


def write_assignment(text: str, section: str, key: str, value: str) -> str:
    return _write_assignment(text, section, key, _quote(value))


def clear_assignment(text: str, section: str, key: str) -> str:
    return _write_assignment(text, section, key, None)


def _write_assignment(text: str, section: str, key: str, value: str | None) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.]+", section) or not re.fullmatch(r"[A-Za-z0-9_]+", key):
        raise FormError("Недопустимое имя поля")
    if text and not text.endswith("\n"):
        text += "\n"
    lines = text.splitlines(keepends=True)
    updated = _upsert_section(lines, section, {key: value})
    rendered = "".join(updated)
    if rendered and not rendered.endswith("\n"):
        rendered += "\n"
    return rendered


def _flat_schema() -> dict[str, str]:
    flat: dict[str, str] = {}
    for section, keys in SCHEMA.items():
        for key, kind in keys.items():
            flat[f"{section}.{key}"] = kind
    return flat


def _stringify(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _format(kind: str, raw: str, name: str) -> str | None:
    if raw == "":
        return None
    if kind == "bool":
        lowered = raw.lower()
        if lowered in {"true", "yes", "1", "да"}:
            return "true"
        if lowered in {"false", "no", "0", "нет"}:
            return "false"
        raise FormError(f"{name}: нужно да или нет")
    if kind == "num":
        normalized = raw.replace(",", ".")
        if not re.fullmatch(r"-?\d+(?:\.\d+)?", normalized):
            raise FormError(f"{name}: нужно число")
        return normalized
    if name.endswith("captcha_lang"):
        lang = raw.upper()
        if lang not in {"RU", "EN"}:
            raise FormError("Язык капчи: RU или EN")
        return _quote(lang)
    return _quote(raw)


def _quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def _section_name(line: str) -> str | None:
    match = re.match(r"^\s*\[([^\]\s][^\]]*)\]\s*(?:#.*)?$", line.rstrip("\r\n"))
    if not match:
        return None
    return match.group(1).strip()


def _assignment_key(line: str) -> str | None:
    stripped = line.lstrip()
    if not stripped or stripped.startswith("#"):
        return None
    match = re.match(r"^\s*([A-Za-z0-9_]+)\s*=", line)
    return match.group(1) if match else None


def _multiline_open(line: str) -> str | None:
    _key, separator, rest = line.partition("=")
    if not separator:
        return None
    body = rest.strip()
    for mark in ('"""', "'''"):
        if body.startswith(mark) and body[len(mark):].count(mark) == 0:
            return mark
    return None


def _upsert_section(lines: list[str], section: str, values: dict[str, str | None]) -> list[str]:
    start = None
    for index, line in enumerate(lines):
        if _section_name(line) == section:
            start = index
            break
    if start is None:
        present = {key: value for key, value in values.items() if value is not None}
        if not present:
            return lines
        block = ["\n", f"[{section}]\n"]
        for key, value in present.items():
            block.append(f"{key} = {value}\n")
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        return lines + block

    end = len(lines)
    for index in range(start + 1, len(lines)):
        if _section_name(lines[index]) is not None:
            end = index
            break
    body = lines[start + 1 : end]
    kept: list[str] = []
    seen: set[str] = set()
    cursor = 0
    while cursor < len(body):
        line = body[cursor]
        key = _assignment_key(line)
        span = 1
        mark = _multiline_open(line) if key else None
        if mark:
            cursor += 1
            while cursor < len(body):
                span += 1
                if mark in body[cursor]:
                    cursor += 1
                    break
                cursor += 1
        else:
            cursor += 1
        if key in values:
            seen.add(key)
            if values[key] is not None:
                newline = "\r\n" if line.endswith("\r\n") else "\n"
                kept.append(f"{key} = {values[key]}{newline}")
            continue
        if span == 1:
            kept.append(line)
        else:
            kept.extend(body[cursor - span : cursor])
    missing = [f"{key} = {value}\n" for key, value in values.items() if key not in seen and value is not None]
    if missing:
        while kept and kept[-1].strip() == "":
            missing = [kept.pop()] + missing
        kept.extend(missing)
    return lines[: start + 1] + kept + lines[end:]
