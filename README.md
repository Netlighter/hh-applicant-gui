# HH Applicant GUI

Локальная панель для [hh-applicant-tool](https://github.com/s3rgeym/hh-applicant-tool). Она не заменяет утилиту: собирает её команды, запускает установленный `hh-applicant-tool` и показывает вывод в журнале внизу окна.

Нужен Python 3.12 или новее.

```bash
make install
make run
```

`make install` создаёт `.venv` и ставит панель вместе с утилитой. `make run` открывает браузер на `http://127.0.0.1:8787`.

Каталог данных тот же, что у утилиты: на macOS это `~/Library/Application Support/hh-applicant-tool`.
