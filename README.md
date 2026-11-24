# HH Applicant GUI

Локальная панель для [hh-applicant-tool](https://github.com/s3rgeym/hh-applicant-tool). Она не заменяет утилиту: собирает её команды, запускает установленный `hh-applicant-tool` и показывает вывод в журнале внизу окна.

Нужен Python 3.12 или новее. Те же команды подходят для Linux, включая Raspberry Pi, и для macOS.

Репозиторий приватный. Для `git clone` нужна ваша учётная запись GitHub с доступом к нему.

## Linux

Поставьте `git`, `make` и Python 3.12+ с модулем `venv`.

Debian, Ubuntu и Raspberry Pi OS:

```bash
sudo apt update
sudo apt install -y git make python3 python3-venv python3-pip
python3 --version
```

На других дистрибутивах возьмите те же пакеты из своего менеджера. Если `python3 --version` меньше 3.12, поставьте пакет `python3.12` и дальше указывайте его явно: `make install PYTHON=python3.12`.

```bash
git clone git@github.com:Netlighter/hh-applicant-gui.git
cd hh-applicant-gui
make install
make run
```

`make install` создаёт `.venv` и ставит панель вместе с утилитой. `make run` открывает браузер на `http://127.0.0.1:8787`.

Если у машины нет своего экрана, браузер не открывайте и слушайте сеть дома:

```bash
.venv/bin/hh-applicant-gui --host 0.0.0.0 --port 8787 --no-open
```

Панель после этого открывается с другого компьютера: `http://<адрес-машины>:8787`. На ней лежат ключи из `config.toml`. Оставляйте порт только в своей сети и не публикуйте его в интернет.

## macOS

```bash
git clone git@github.com:Netlighter/hh-applicant-gui.git
cd hh-applicant-gui
make install
make run
```

## Обновление

Версия панели написана в правом нижнем углу страницы. Рядом команда обновления.

Обновить панель и утилиту в её окружении:

```bash
git pull
make update
```

После этого остановите старый процесс и снова запустите `make run`. Пока старый процесс держит порт 8787, второй запуск не поднимется.

Кнопка «Обновления» на обзоре только спрашивает у `hh-applicant-tool`, вышла ли новая версия утилиты, и печатает ответ в журнал. Саму панель эта кнопка не обновляет. Новую утилиту ставит `make update`.

## Данные

Каталог тот же, что у утилиты.

- Linux: `~/.config/hh-applicant-tool`
- macOS: `~/Library/Application Support/hh-applicant-tool`
