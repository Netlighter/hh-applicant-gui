from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any, Callable

from .paths import gui_config_dir

INTERVIEW_RE = re.compile(
    r"собеседован|интервью|\binterview\b|видеозвон|telemost\.|zoom\.us|meet\.google",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\w)(?:\+\d[\d\-\s()]{8,}\d|\b[78][\d\-\s()]{9,}\d)")
LINK_RE = re.compile(r"(?:https?://)?(?:t\.me/[\w\d_]{3,}|wa\.me/\d{8,})", re.IGNORECASE)
TELEGRAM_HINT_RE = re.compile(r"телег|telegram|\btg\b|t\.me", re.IGNORECASE)
HANDLE_RE = re.compile(r"(?<![\w.])@[\w\d_]{4,}")

TAG_INTERVIEW = "Собеседование"
TAG_INVITE = "Приглашение"
TAG_CONTACT = "Контакты"


class LeadError(RuntimeError):
    pass


MAX_SCAN = 1000


def clamp_limit(limit: object) -> int:
    try:
        number = int(limit)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        number = 80
    return max(1, min(number, MAX_SCAN))


def collect_leads(
    globals_: dict,
    limit: int,
    progress: Callable[[str], None] | None = None,
    cancelled: Callable[[], bool] | None = None,
) -> dict[str, Any]:
    return _collect(globals_, limit, progress, cancelled)


def _collect(
    globals_: dict,
    limit: int,
    progress: Callable[[str], None] | None = None,
    cancelled: Callable[[], bool] | None = None,
) -> dict[str, Any]:
    from hh_applicant_tool.api.errors import ApiError

    limit = clamp_limit(limit)
    tool = _open_tool(globals_)
    try:
        negotiations, found, listed_stopped = _list_negotiations(tool, cancelled, progress)
    except ApiError as exc:
        raise LeadError(_api_message(exc)) from exc
    except OSError as exc:
        raise LeadError(str(exc)) from exc

    total = found if isinstance(found, int) and found >= len(negotiations) else len(negotiations)
    if listed_stopped:
        return {
            "items": [],
            "scanned": 0,
            "total": total,
            "truncated": True,
            "stopped": True,
            "limit": limit,
        }
    ranked = sorted(negotiations, key=_priority)
    rows: list[dict[str, Any]] = []
    scanned = 0
    stopped = False
    goal = min(limit, len(ranked))
    for item in ranked:
        if scanned >= limit:
            break
        if cancelled and cancelled():
            stopped = True
            break
        scanned += 1
        vacancy = item.get("vacancy") if isinstance(item.get("vacancy"), dict) else {}
        employer = vacancy.get("employer") if isinstance(vacancy.get("employer"), dict) else {}
        label = str(employer.get("name") or vacancy.get("name") or "чат")
        if progress:
            progress(f"{scanned}/{goal} · {label}")
        if cancelled and cancelled():
            stopped = True
            break
        try:
            messages = _messages(tool, str(item.get("id") or ""))
        except ApiError:
            messages = []
        row = summarize(item, messages)
        if row:
            rows.append(row)
    rows.sort(key=lambda row: row.get("when") or "", reverse=True)
    rows.sort(key=lambda row: _tag_rank(row["tags"]))
    return {
        "items": rows,
        "scanned": scanned,
        "total": total,
        "truncated": stopped or scanned < total,
        "stopped": stopped,
        "limit": limit,
    }


def cache_path(folder: Path, root: Path | None = None) -> Path:
    digest = hashlib.sha256(str(folder.resolve()).encode()).hexdigest()[:20]
    directory = root if root is not None else gui_config_dir() / "leads"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{digest}.json"


def read_cache(folder: Path, root: Path | None = None) -> dict[str, Any]:
    path = cache_path(folder, root)
    empty: dict[str, Any] = {
        "items": [],
        "scanned": 0,
        "total": 0,
        "truncated": False,
        "stopped": False,
        "limit": 0,
        "savedAt": None,
    }
    if not path.is_file():
        return empty
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return empty
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        return empty
    data.setdefault("savedAt", None)
    return data


def write_cache(folder: Path, result: dict[str, Any], root: Path | None = None) -> dict[str, Any]:
    payload = {
        "items": result.get("items") if isinstance(result.get("items"), list) else [],
        "scanned": int(result.get("scanned") or 0),
        "total": int(result.get("total") or 0),
        "truncated": bool(result.get("truncated")),
        "stopped": bool(result.get("stopped")),
        "limit": int(result.get("limit") or 0),
        "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    path = cache_path(folder, root)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)
    return payload


def summarize(negotiation: dict, messages: list[dict]) -> dict[str, Any] | None:
    vacancy = negotiation.get("vacancy") if isinstance(negotiation.get("vacancy"), dict) else {}
    employer = vacancy.get("employer") if isinstance(vacancy.get("employer"), dict) else {}
    state = negotiation.get("state") if isinstance(negotiation.get("state"), dict) else {}
    state_id = str(state.get("id") or "").lower()
    tags: list[str] = []
    if state_id == "interview":
        tags.append(TAG_INTERVIEW)
    elif state_id == "invitation":
        tags.append(TAG_INVITE)

    contacts: list[str] = []
    snippet = ""
    when = str(negotiation.get("updated_at") or negotiation.get("created_at") or "")
    person = ""
    for message in messages:
        if not _from_employer(message):
            continue
        text = str(message.get("text") or "")
        found = extract_contacts(text)
        address = _format_address(message.get("address"))
        if address:
            found.append(address)
        interview = bool(INTERVIEW_RE.search(text))
        if interview and TAG_INTERVIEW not in tags:
            tags.append(TAG_INTERVIEW)
        if found:
            for item in found:
                if item not in contacts:
                    contacts.append(item)
        if (found or interview) and not snippet:
            snippet = _short(text)
            when = str(message.get("created_at") or when)
            person = _person(message)
    if contacts and TAG_CONTACT not in tags:
        tags.append(TAG_CONTACT)
    if TAG_INTERVIEW in tags and TAG_INVITE in tags:
        tags = [tag for tag in tags if tag != TAG_INVITE]
    if not tags:
        return None
    return {
        "company": str(employer.get("name") or "Работодатель"),
        "vacancy": str(vacancy.get("name") or "Вакансия"),
        "url": str(vacancy.get("alternate_url") or negotiation.get("url") or ""),
        "tags": tags,
        "contacts": contacts[:8],
        "when": when,
        "snippet": snippet,
        "person": person,
    }


def extract_contacts(text: str) -> list[str]:
    found: list[str] = []

    def add(value: str) -> None:
        cleaned = " ".join(value.split())
        if cleaned and cleaned not in found:
            found.append(cleaned)

    for match in EMAIL_RE.findall(text):
        add(match)
    for match in PHONE_RE.findall(text):
        digits = re.sub(r"\D", "", match)
        if 10 <= len(digits) <= 15:
            add(match.strip())
    for match in LINK_RE.findall(text):
        add(match)
    if TELEGRAM_HINT_RE.search(text):
        for match in HANDLE_RE.findall(text):
            add(match)
    return found


def _from_employer(message: dict) -> bool:
    author = message.get("author") if isinstance(message.get("author"), dict) else {}
    kind = str(author.get("participant_type") or author.get("type") or "").lower()
    return kind in {"employer", "employer_manager"}


def _person(message: dict) -> str:
    author = message.get("author") if isinstance(message.get("author"), dict) else {}
    return str(author.get("name") or author.get("display_name") or "")


def _format_address(address: object) -> str:
    if not isinstance(address, dict):
        return ""
    parts = [str(address.get(key) or "").strip() for key in ("city", "street", "building")]
    parts = [part for part in parts if part]
    if not parts:
        raw = address.get("raw") or address.get("description")
        return f"адрес: {raw}" if raw else ""
    return "адрес: " + ", ".join(parts)


def _short(text: str) -> str:
    compact = " ".join(text.split())
    if len(compact) > 220:
        return compact[:220] + "…"
    return compact


def _priority(item: dict) -> tuple[int, str]:
    state = item.get("state") if isinstance(item.get("state"), dict) else {}
    state_id = str(state.get("id") or "")
    rank = {"interview": 0, "invitation": 1, "hired": 2}.get(state_id, 3)
    return rank, str(item.get("updated_at") or "")


def _tag_rank(tags: list[str]) -> int:
    if TAG_INTERVIEW in tags:
        return 0
    if TAG_INVITE in tags:
        return 1
    return 2


def _list_negotiations(
    tool: Any,
    cancelled: Callable[[], bool] | None = None,
    progress: Callable[[str], None] | None = None,
) -> tuple[list[dict], int | None, bool]:
    items: list[dict] = []
    found: int | None = None
    for page in range(20):
        if cancelled and cancelled():
            return items, found, True
        if progress:
            progress(f"Список переписок, страница {page + 1}")
        payload = tool.api_client.get("/negotiations", page=page, per_page=50)
        if isinstance(payload, dict) and isinstance(payload.get("found"), int):
            found = payload["found"]
        batch = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(batch, list) or not batch:
            break
        items.extend(item for item in batch if isinstance(item, dict))
        pages = payload.get("pages") if isinstance(payload, dict) else None
        if isinstance(pages, int) and page + 1 >= pages:
            break
    return items, found, False


def _messages(tool: Any, negotiation_id: str) -> list[dict]:
    if not negotiation_id:
        return []
    collected: list[dict] = []
    for page in range(3):
        payload = tool.api_client.get(
            f"/negotiations/{negotiation_id}/messages",
            page=page,
            per_page=50,
        )
        batch = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(batch, list) or not batch:
            break
        collected.extend(item for item in batch if isinstance(item, dict))
        pages = payload.get("pages") if isinstance(payload, dict) else None
        if not isinstance(pages, int) or page + 1 >= pages:
            break
    return collected


def _open_tool(globals_: dict) -> Any:
    from hh_applicant_tool.tool import HHApplicantTool

    config_dir = globals_.get("configDir")
    profile = str(globals_.get("profile") or ".")
    kwargs: dict[str, Any] = {
        "captcha_handling": False,
        "use_ai": False,
        "verbosity": 0,
    }
    if isinstance(config_dir, str) and config_dir.strip():
        folder = Path(config_dir).expanduser()
        if not folder.is_absolute():
            raise LeadError("Каталог конфигов должен быть абсолютным путём")
        kwargs["config_dir"] = folder
    if profile not in {".", "default"}:
        kwargs["profile_id"] = profile
    delay = globals_.get("apiDelay")
    if isinstance(delay, str) and delay.strip():
        try:
            kwargs["api_delay"] = float(delay.strip())
        except ValueError as exc:
            raise LeadError("Задержка API должна быть числом") from exc
    for source, target in (
        ("baseUrl", "base_url"),
        ("proxyUrl", "proxy_url"),
        ("userAgent", "user_agent"),
    ):
        value = globals_.get(source)
        if isinstance(value, str) and value.strip():
            kwargs[target] = value.strip()
    return HHApplicantTool(**kwargs)


def _api_message(exc: Any) -> str:
    if exc.status_code in {401, 403}:
        return "Нет действующего входа. Откройте раздел «Вход»: токен не найден или сайт его отклонил."
    text = str(exc).strip() or "Сайт не отдал переписки"
    return text[:360]
