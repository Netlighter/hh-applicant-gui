#!/usr/bin/env bash
# Скачивает панель архивом с GitHub и ставит её. Логин и git не нужны.
set -euo pipefail

REPO="${HH_GUI_REPO:-Netlighter/hh-applicant-gui}"
BRANCH="${HH_GUI_BRANCH:-main}"
DEST="${HH_GUI_DIR:-$HOME/hh-applicant-gui}"
ARCHIVE_URL="${HH_GUI_ARCHIVE_URL:-https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz}"

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

pick_python() {
  local bin
  for bin in python3.13 python3.12 python3; do
    if command -v "$bin" >/dev/null 2>&1 && "$bin" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'; then
      command -v "$bin"
      return 0
    fi
  done
  return 1
}

install_debian_packages() {
  export DEBIAN_FRONTEND=noninteractive
  as_root apt-get update
  as_root apt-get install -y ca-certificates curl python3 python3-venv python3-pip
  local py=""
  py="$(pick_python || true)"
  if [[ -z "$py" ]]; then
    as_root apt-get install -y python3.12 python3.12-venv python3-pip \
      || as_root apt-get install -y python3.13 python3.13-venv python3-pip
  fi
}

ensure_tools() {
  if command -v curl >/dev/null 2>&1 && pick_python >/dev/null 2>&1; then
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    install_debian_packages
    return 0
  fi
  if command -v dnf >/dev/null 2>&1; then
    as_root dnf install -y ca-certificates curl python3 python3-pip
    return 0
  fi
  if command -v pacman >/dev/null 2>&1; then
    as_root pacman -Sy --noconfirm ca-certificates curl python
    return 0
  fi
  echo "Нужны curl и Python 3.12 или новее с модулем venv." >&2
  exit 1
}

download_sources() {
  local tmp src
  tmp="$(mktemp -d)"
  trap 'rm -rf "'"$tmp"'"' RETURN
  echo "Скачиваю панель..."
  curl -fsSL --retry 3 --connect-timeout 20 "$ARCHIVE_URL" -o "$tmp/src.tar.gz"
  tar -xzf "$tmp/src.tar.gz" -C "$tmp"
  src=""
  for dir in "$tmp"/*/; do
    if [[ -f "${dir}pyproject.toml" ]]; then
      src="${dir%/}"
      break
    fi
  done
  if [[ -z "$src" ]]; then
    echo "Архив скачался, но внутри нет проекта." >&2
    exit 1
  fi
  mkdir -p "$DEST"
  tar -C "$src" -cf - . | tar -C "$DEST" -xf -
}

install_panel() {
  local py="$1"
  if [[ ! -x "$DEST/.venv/bin/python" ]]; then
    if ! "$py" -m venv "$DEST/.venv"; then
      if command -v apt-get >/dev/null 2>&1; then
        as_root apt-get install -y "$(basename "$py")-venv" python3-pip
        "$py" -m venv "$DEST/.venv"
      else
        echo "Не удалось создать .venv. Поставьте пакет venv для $py." >&2
        exit 1
      fi
    fi
  fi
  "$DEST/.venv/bin/python" -m pip install -U pip
  "$DEST/.venv/bin/python" -m pip install -U -e "$DEST"
}

main() {
  ensure_tools
  local py
  py="$(pick_python)"
  download_sources
  install_panel "$py"
  cat <<EOF

Панель установлена: $DEST
Запуск: $DEST/.venv/bin/hh-applicant-gui
Без своего экрана: $DEST/.venv/bin/hh-applicant-gui --host 0.0.0.0 --port 8787 --no-open

Повторный запуск этого скрипта обновляет панель. Старый процесс перед запуском нужно остановить.
EOF
}

main "$@"
