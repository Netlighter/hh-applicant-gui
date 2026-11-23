from __future__ import annotations

import time
from pathlib import Path


def summarize_day(path: Path, today: str | None = None) -> dict[str, int | str]:
    day = today or time.strftime("%Y-%m-%d")
    applies = 0
    replies = 0
    if path.is_file():
        with path.open(encoding="utf-8", errors="replace") as handle:
            for line in handle:
                if not line.startswith(day):
                    continue
                if "Отправили отклик на вакансию" in line:
                    applies += 1
                elif "Отвечаем в чат:" in line:
                    replies += 1
    return {"date": day, "applies": applies, "replies": replies}
