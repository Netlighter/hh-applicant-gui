from __future__ import annotations

import tomllib

from hh_applicant_tool.operations.apply_vacancies import (
    DEFAULT_AI_FILTER_PROMPT,
    DEFAULT_AI_FILTER_SYSTEM_PROMPT,
    DEFAULT_COVER_LETTER_PROMPT,
    DEFAULT_COVER_LETTER_SYSTEM_PROMPT,
    DEFAULT_TEST_CHOICE_PROMPT,
    DEFAULT_TEST_SYSTEM_PROMPT,
    DEFAULT_TEST_TEXT_PROMPT,
)
from hh_applicant_tool.operations.reply_chats import (
    DEFAULT_BUMP_PROMPT,
    DEFAULT_OPTIONS_PROMPT,
    DEFAULT_OPTIONS_SYSTEM_PROMPT,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_USER_PROMPT,
    FAREWELL_MESSAGE,
)

from .toml_form import FormError, clear_assignment, write_assignment

MAX_PROMPT = 12_000

Field = dict[str, str]
Tab = dict[str, object]


def _field(label: str, section: str, key: str, default: str, help_text: str) -> Field:
    return {
        "label": label,
        "section": section,
        "key": key,
        "default": default,
        "help": help_text,
    }


GROUPS: dict[str, list[dict[str, object]]] = {
    "apply": [
        {
            "id": "filter",
            "title": "Фильтр",
            "fields": [
                _field(
                    "Запрос",
                    "general",
                    "ai_filter_prompt",
                    DEFAULT_AI_FILTER_PROMPT,
                    "Пользовательский текст. В него подставляются резюме и вакансия.",
                ),
                _field(
                    "Системный",
                    "openai.vacancy_filter",
                    "system_prompt",
                    DEFAULT_AI_FILTER_SYSTEM_PROMPT,
                    "Правила ответа. Плейсхолдеры здесь не раскрываются.",
                ),
            ],
        },
        {
            "id": "letter",
            "title": "Письмо",
            "fields": [
                _field(
                    "Запрос",
                    "general",
                    "cover_letter_prompt",
                    DEFAULT_COVER_LETTER_PROMPT,
                    "Пользовательский текст для сопроводительного.",
                ),
                _field(
                    "Системный",
                    "openai.cover_letter",
                    "system_prompt",
                    DEFAULT_COVER_LETTER_SYSTEM_PROMPT,
                    "Правила письма. По умолчанию это встроенный текст утилиты.",
                ),
            ],
        },
        {
            "id": "tests",
            "title": "Тесты",
            "fields": [
                _field(
                    "Выбор варианта",
                    "general",
                    "test_choice_prompt",
                    DEFAULT_TEST_CHOICE_PROMPT,
                    "Вопрос с вариантами. Ответ — id варианта.",
                ),
                _field(
                    "Свой ответ",
                    "general",
                    "test_text_prompt",
                    DEFAULT_TEST_TEXT_PROMPT,
                    "Вопрос без вариантов.",
                ),
                _field(
                    "Системный",
                    "openai.test_solver",
                    "system_prompt",
                    DEFAULT_TEST_SYSTEM_PROMPT,
                    "Общие правила для обоих тестов.",
                ),
            ],
        },
    ],
    "chats": [
        {
            "id": "reply",
            "title": "Ответ",
            "fields": [
                _field(
                    "Запрос",
                    "general",
                    "reply_chat_user_prompt",
                    DEFAULT_USER_PROMPT,
                    "Текст, по которому модель пишет сообщение работодателю.",
                ),
                _field(
                    "Системный",
                    "openai.reply_chat",
                    "system_prompt",
                    DEFAULT_SYSTEM_PROMPT,
                    "Правила ответа. Тот же системный текст использует напоминание.",
                ),
                _field(
                    "Фраза прощания",
                    "general",
                    "reply_chat_farewell_message",
                    FAREWELL_MESSAGE,
                    "Этой фразой утилита понимает отказ и выходит из чата.",
                ),
            ],
        },
        {
            "id": "options",
            "title": "Кнопки",
            "fields": [
                _field(
                    "Запрос",
                    "general",
                    "reply_chat_options_prompt",
                    DEFAULT_OPTIONS_PROMPT,
                    "Модель выбирает один из вариантов работодателя.",
                ),
                _field(
                    "Системный",
                    "openai.reply_chat_options",
                    "system_prompt",
                    DEFAULT_OPTIONS_SYSTEM_PROMPT,
                    "Правила выбора кнопки.",
                ),
            ],
        },
        {
            "id": "bump",
            "title": "Напоминание",
            "fields": [
                _field(
                    "Запрос",
                    "general",
                    "reply_chat_bump_prompt",
                    DEFAULT_BUMP_PROMPT,
                    "Короткое сообщение, если работодатель молчит. Системный текст общий с вкладкой «Ответ».",
                ),
            ],
        },
    ],
}


def known_groups() -> set[str]:
    return set(GROUPS)


def _stored(data: dict, section: str, key: str) -> str | None:
    node: object = data
    for part in section.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    if not isinstance(node, dict) or key not in node:
        return None
    value = node.get(key)
    return value if isinstance(value, str) else None


def _same(left: str, right: str) -> bool:
    return left.strip() == right.strip()


def read_group(text: str, group: str) -> dict:
    if group not in GROUPS:
        raise FormError("Неизвестный раздел промптов")
    try:
        data = tomllib.loads(text) if text.strip() else {}
    except tomllib.TOMLDecodeError as exc:
        raise FormError(f"config.toml не читается: {exc}") from exc
    if not isinstance(data, dict):
        data = {}
    tabs = []
    for tab in GROUPS[group]:
        fields = []
        for field in tab["fields"]:
            assert isinstance(field, dict)
            stored = _stored(data, field["section"], field["key"])
            custom = stored is not None and not _same(stored, field["default"])
            fields.append({**field, "value": stored if custom else field["default"], "custom": custom})
        tabs.append({"id": tab["id"], "title": tab["title"], "fields": fields})
    return {"group": group, "tabs": tabs}


def _catalog() -> dict[tuple[str, str], str]:
    found: dict[tuple[str, str], str] = {}
    for tabs in GROUPS.values():
        for tab in tabs:
            for field in tab["fields"]:
                assert isinstance(field, dict)
                found[(field["section"], field["key"])] = field["default"]
    return found


def apply_edits(text: str, edits: list[dict]) -> str:
    catalog = _catalog()
    for edit in edits:
        section = edit.get("section")
        key = edit.get("key")
        value = edit.get("value")
        if not isinstance(section, str) or not isinstance(key, str) or not isinstance(value, str):
            raise FormError("Поле промпта задано неверно")
        default = catalog.get((section, key))
        if default is None:
            raise FormError("Это поле промпта нельзя менять отсюда")
        if len(value) > MAX_PROMPT:
            raise FormError("Промпт длиннее 12000 символов")
        if _same(value, default):
            text = clear_assignment(text, section, key)
        else:
            text = write_assignment(text, section, key, value.strip())
    return text
