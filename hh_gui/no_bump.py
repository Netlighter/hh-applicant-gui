"""Запуск reply-chats без напоминаний работодателю.

У утилиты нет такого флага. Перед её стартом пропуск чатов, где последнее
сообщение уже наше, включается здесь. Отказы по-прежнему закрываются.
"""

from __future__ import annotations

import sys


def install() -> None:
    import hh_applicant_tool.operations.reply_chats as reply

    original = reply.Operation.is_processable

    def is_processable(self, chat):  # type: ignore[no-untyped-def]
        if getattr(chat, "last_is_mine", False) and getattr(chat, "applicant_state", "") != "DISCARD":
            return False
        return original(self, chat)

    reply.Operation.is_processable = is_processable


def main() -> None:
    install()
    from hh_applicant_tool.main import main as tool_main

    raise SystemExit(tool_main(sys.argv[1:]))


if __name__ == "__main__":
    main()
