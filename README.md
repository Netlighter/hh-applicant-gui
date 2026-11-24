# HH Applicant GUI

Локальная панель для [hh-applicant-tool](https://github.com/s3rgeym/hh-applicant-tool). Она не заменяет утилиту: собирает её команды, запускает установленный `hh-applicant-tool` и показывает вывод в журнале внизу окна.

Нужен Python 3.12 или новее. Скрипт сам ставит его на Debian, Ubuntu и Raspberry Pi OS, если в системе пакет ещё есть. Логин в GitHub не нужен.

## Установка

Одна команда на Linux и macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/Netlighter/hh-applicant-gui/main/install.sh | bash
```

Скрипт скачивает архив проекта, создаёт `.venv` в `~/hh-applicant-gui` и ставит панель вместе с утилитой.

Запуск:

```bash
~/hh-applicant-gui/.venv/bin/hh-applicant-gui
```

Откроется браузер на `http://127.0.0.1:8787`. Если у машины нет своего экрана:

```bash
~/hh-applicant-gui/.venv/bin/hh-applicant-gui --host 0.0.0.0 --port 8787 --no-open
```

Панель после этого открывается с другого компьютера: `http://<адрес-машины>:8787`. На ней лежат ключи из `config.toml`. Оставляйте порт только в своей сети и не публикуйте его в интернет.

Другой каталог: `HH_GUI_DIR=/opt/hh-applicant-gui curl -fsSL https://raw.githubusercontent.com/Netlighter/hh-applicant-gui/main/install.sh | bash`.

## Обновление

Та же команда, что при установке. Она скачивает свежий архив и обновляет пакеты в `.venv`. Версия панели и эта команда написаны в правом нижнем углу страницы.

Перед новым запуском остановите старый процесс. Пока он держит порт 8787, второй не поднимется.

Кнопка «Обновления» на обзоре только спрашивает у `hh-applicant-tool`, вышла ли новая версия утилиты, и печатает ответ в журнал. Саму панель эта кнопка не обновляет.

## Данные

Каталог тот же, что у утилиты.

- Linux: `~/.config/hh-applicant-tool`
- macOS: `~/Library/Application Support/hh-applicant-tool`
