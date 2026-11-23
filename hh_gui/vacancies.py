from __future__ import annotations

import hashlib
import json
import math
import re
import time
from pathlib import Path
from typing import Any, Callable

from .leads import LeadError, _open_tool
from .paths import gui_config_dir

MAX_SCORE = 100
BRIEF_LIMIT = 2000
SYSTEM_PROMPT = (
    "Ты оцениваешь, насколько вакансия подходит под критерий. "
    "Ответь одним целым числом от 0 до 100. Без слов и знаков."
)


class VacancyError(RuntimeError):
    pass


def clamp_score_limit(limit: object) -> int:
    try:
        number = int(limit)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        number = 20
    return max(1, min(number, MAX_SCORE))


def prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.strip().encode()).hexdigest()[:20]


def parse_score(text: str) -> int | None:
    match = re.search(r"\d{1,3}", text or "")
    if not match:
        return None
    return max(0, min(100, int(match.group())))


def response_count(item: dict) -> int | None:
    counters = item.get("counters") if isinstance(item.get("counters"), dict) else {}
    raw = counters.get("responses", item.get("responses_count"))
    if isinstance(raw, bool) or raw is None:
        return None
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str) and raw.isdigit():
        return int(raw)
    return None


def vacancy_brief(item: dict, description: str = "") -> str:
    snippet = item.get("snippet") if isinstance(item.get("snippet"), dict) else {}
    employer = item.get("employer") if isinstance(item.get("employer"), dict) else {}
    parts = [
        str(item.get("name") or ""),
        str(employer.get("name") or ""),
        _salary(item),
        str(snippet.get("requirement") or ""),
        str(snippet.get("responsibility") or ""),
        description,
    ]
    text = " ".join(part.strip() for part in parts if part and part.strip())
    return text[:BRIEF_LIMIT]


def cached_score(previous: list[dict], vacancy_id: str, digest: str) -> int | None:
    for row in previous:
        if str(row.get("id") or "") != vacancy_id:
            continue
        if row.get("promptHash") != digest:
            continue
        score = row.get("score")
        if isinstance(score, int):
            return score
    return None


def collect_matches(
    globals_: dict,
    search: dict,
    prompt: str,
    limit: int,
    progress: Callable[[str], None] | None = None,
    cancelled: Callable[[], bool] | None = None,
    previous: list[dict] | None = None,
) -> dict[str, Any]:
    from hh_applicant_tool.api.errors import ApiError
    from hh_applicant_tool.utils.string import strip_tags

    criterion = str(prompt or "").strip()
    if not criterion:
        raise VacancyError("Напишите, какие вакансии считать подходящими")
    if len(criterion) > 4000:
        raise VacancyError("Промпт длиннее 4000 символов")
    if globals_.get("useAi") is False:
        raise VacancyError("AI выключен в шапке панели")

    limit = clamp_score_limit(limit)
    digest = prompt_hash(criterion)
    known = previous or []
    tool = _open_scoring_tool(globals_)
    try:
        chat = tool.ai_chat_for(
            "openai.vacancy_filter",
            system_prompt=SYSTEM_PROMPT,
            temperature=0.0,
            max_completion_tokens=16,
        )
    except (ValueError, OSError) as exc:
        raise VacancyError(str(exc)) from exc
    chat.system_prompt = SYSTEM_PROMPT
    chat.temperature = 0.0
    chat.max_completion_tokens = 16

    try:
        found, cards, resume_title = _search(tool, search if isinstance(search, dict) else {}, limit, cancelled)
    except ApiError as exc:
        raise VacancyError(_api_message(exc)) from exc
    except LeadError as exc:
        raise VacancyError(str(exc)) from exc

    rows: list[dict[str, Any]] = []
    asked = 0
    reused = 0
    stopped = False
    for index, item in enumerate(cards, start=1):
        if cancelled and cancelled():
            stopped = True
            break
        vacancy_id = str(item.get("id") or "")
        employer = item.get("employer") if isinstance(item.get("employer"), dict) else {}
        company = str(employer.get("name") or "Работодатель")
        title = str(item.get("name") or "Вакансия")
        score = cached_score(known, vacancy_id, digest)
        if score is None:
            brief = vacancy_brief(item)
            if len(brief) < 80 and vacancy_id:
                if cancelled and cancelled():
                    stopped = True
                    break
                try:
                    full = tool.api_client.get(f"/vacancies/{vacancy_id}")
                except ApiError:
                    full = {}
                if isinstance(full, dict):
                    skills = ", ".join(
                        str(skill.get("name") or "")
                        for skill in (full.get("key_skills") or [])
                        if isinstance(skill, dict) and skill.get("name")
                    )
                    brief = vacancy_brief(item, f"{skills} {strip_tags(str(full.get('description') or ''))}")
            if progress:
                progress(f"{index}/{len(cards)} · {company} — {title}")
            answer = chat.complete(
                f"Критерий:\n{criterion}\n\nВакансия:\n{brief}\n\nЧисло от 0 до 100:"
            )
            score = parse_score(answer)
            asked += 1
            if progress:
                progress(f"  {score if score is not None else 'нет числа'}")
        else:
            reused += 1
            if progress:
                progress(f"{index}/{len(cards)} · {company} — уже оценена, запрос не повторяю")
        rows.append(
            {
                "id": vacancy_id,
                "company": company,
                "vacancy": title,
                "url": str(item.get("alternate_url") or ""),
                "responses": response_count(item),
                "score": score,
                "promptHash": digest,
            }
        )
    rows.sort(key=lambda row: (row["score"] is None, -(row["score"] or 0), row["company"]))
    return {
        "items": rows,
        "scanned": len(rows),
        "total": found,
        "limit": limit,
        "asked": asked,
        "reused": reused,
        "stopped": stopped,
        "truncated": stopped or len(cards) < found,
        "resume": resume_title,
        "prompt": criterion,
    }


def read_match_cache(folder: Path, root: Path | None = None) -> dict[str, Any]:
    path = _cache_path(folder, root)
    empty: dict[str, Any] = {"items": [], "savedAt": None, "prompt": "", "scanned": 0, "total": 0}
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


def write_match_cache(folder: Path, result: dict[str, Any], root: Path | None = None) -> dict[str, Any]:
    payload = {
        "items": result.get("items") if isinstance(result.get("items"), list) else [],
        "scanned": int(result.get("scanned") or 0),
        "total": int(result.get("total") or 0),
        "limit": int(result.get("limit") or 0),
        "asked": int(result.get("asked") or 0),
        "reused": int(result.get("reused") or 0),
        "stopped": bool(result.get("stopped")),
        "truncated": bool(result.get("truncated")),
        "resume": str(result.get("resume") or ""),
        "prompt": str(result.get("prompt") or ""),
        "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    path = _cache_path(folder, root)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)
    return payload


def _cache_path(folder: Path, root: Path | None) -> Path:
    digest = hashlib.sha256(str(folder.resolve()).encode()).hexdigest()[:20]
    directory = root if root is not None else gui_config_dir() / "vacancies"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{digest}.json"


def _open_scoring_tool(globals_: dict) -> Any:
    from hh_applicant_tool.tool import HHApplicantTool

    tool = _open_tool(globals_)
    tool.use_ai = True
    for source, target in (
        ("openaiDelay", "openai_delay"),
        ("openaiTimeout", "openai_timeout"),
        ("openaiConnectTimeout", "openai_connect_timeout"),
    ):
        raw = globals_.get(source)
        if isinstance(raw, str) and raw.strip():
            try:
                setattr(tool, target, float(raw.strip()))
            except ValueError as exc:
                raise VacancyError("Задержка или таймаут модели должны быть числом") from exc
    proxy = globals_.get("openaiProxy")
    if isinstance(proxy, str) and proxy.strip():
        tool.openai_proxy_url = proxy.strip()
    return tool if isinstance(tool, HHApplicantTool) else tool


def _search(
    tool: Any,
    search: dict,
    limit: int,
    cancelled: Callable[[], bool] | None,
) -> tuple[int, list[dict], str]:
    per_page = _number(search.get("perPage"), 20, 1, 100)
    pages = min(20, max(1, math.ceil(limit / per_page)))
    text = str(search.get("search") or "").strip()
    resume_title = ""
    endpoint = "/vacancies"
    if not text:
        resume_id, resume_title = _resume(tool, str(search.get("resumeId") or ""))
        endpoint = f"/resumes/{resume_id}/similar_vacancies"
    found = 0
    cards: list[dict] = []
    for page in range(pages):
        if cancelled and cancelled():
            break
        if len(cards) >= limit:
            break
        params = _params(search, page, per_page, text)
        payload = tool.api_client.get(endpoint, params)
        if isinstance(payload, dict) and isinstance(payload.get("found"), int):
            found = payload["found"]
        batch = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(batch, list) or not batch:
            break
        for item in batch:
            if isinstance(item, dict):
                cards.append(item)
            if len(cards) >= limit:
                break
        page_count = payload.get("pages") if isinstance(payload, dict) else None
        if isinstance(page_count, int) and page + 1 >= page_count:
            break
    return found, cards[:limit], resume_title


def _resume(tool: Any, resume_id: str) -> tuple[str, str]:
    resumes = tool.get_resumes()
    published = [
        item
        for item in resumes
        if isinstance(item, dict) and isinstance(item.get("status"), dict) and item["status"].get("id") == "published"
    ]
    if resume_id:
        published = [item for item in published if item.get("id") == resume_id]
        if not published:
            raise VacancyError("Выбранное резюме не опубликовано")
    if not published:
        raise VacancyError("Нет опубликованного резюме. Для поиска по строке резюме не нужно.")
    chosen = published[0]
    return str(chosen.get("id") or ""), str(chosen.get("title") or "")


def _params(search: dict, page: int, per_page: int, text: str) -> dict[str, Any]:
    params: dict[str, Any] = {"page": page, "per_page": per_page}
    if text:
        params["text"] = text
    mapping = {
        "orderBy": "order_by",
        "experience": "experience",
        "schedule": "schedule",
        "salary": "salary",
        "currency": "currency",
        "period": "period",
        "dateFrom": "date_from",
        "dateTo": "date_to",
        "topLat": "top_lat",
        "bottomLat": "bottom_lat",
        "leftLng": "left_lng",
        "rightLng": "right_lng",
        "sortPointLat": "sort_point_lat",
        "sortPointLng": "sort_point_lng",
    }
    for source, target in mapping.items():
        value = search.get(source)
        if isinstance(value, str) and value.strip():
            params[target] = value.strip()
    for source, target in (
        ("workFormat", "work_format"),
        ("employment", "employment"),
        ("area", "area"),
        ("metro", "metro"),
        ("professionalRole", "professional_role"),
        ("industry", "industry"),
        ("employerId", "employer_id"),
        ("excludedEmployerId", "excluded_employer_id"),
        ("label", "label"),
        ("searchField", "search_field"),
    ):
        values = _tokens(search.get(source))
        if values:
            params[target] = values
    for source, target in (("onlyWithSalary", "only_with_salary"), ("premium", "premium")):
        flag = search.get(source)
        if flag == "yes":
            params[target] = "true"
        elif flag == "no":
            params[target] = "false"
    if search.get("noMagic") is True:
        params["no_magic"] = "true"
    return params


def _tokens(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not isinstance(value, str):
        return []
    return [part for part in value.replace(",", " ").split() if part]


def _number(value: object, default: int, low: int, high: int) -> int:
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        number = default
    return max(low, min(number, high))


def _salary(item: dict) -> str:
    salary = item.get("salary")
    if not isinstance(salary, dict):
        return ""
    currency = str(salary.get("currency") or "").strip()
    start = salary.get("from")
    end = salary.get("to")
    if start and end:
        body = f"{start}–{end}"
    elif start:
        body = f"от {start}"
    elif end:
        body = f"до {end}"
    else:
        return ""
    return f"{body} {currency}".strip()


def _api_message(exc: Any) -> str:
    if exc.status_code in {401, 403}:
        return "Нет действующего входа. Откройте раздел «Вход»."
    text = str(exc).strip() or "Сайт не отдал вакансии"
    return text[:360]
