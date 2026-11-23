from __future__ import annotations

import argparse
import sys
import threading
import webbrowser

import uvicorn


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Локальная панель для hh-applicant-tool",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Не открывать браузер",
    )
    args = parser.parse_args(argv)
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        print(
            "Панель отдаёт config.toml с ключами. "
            f"Адрес {args.host} доступен не только этому компьютеру.",
            file=sys.stderr,
        )
    url = f"http://127.0.0.1:{args.port}" if args.host in {"0.0.0.0", "::"} else f"http://{args.host}:{args.port}"
    print(f"HH Applicant GUI: {url}")
    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    uvicorn.run(
        "hh_gui.server:app",
        host=args.host,
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
