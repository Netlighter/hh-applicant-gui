PYTHON ?= python3

.PHONY: install update run

install:
	$(PYTHON) -m venv .venv
	.venv/bin/python -m pip install -U pip
	.venv/bin/python -m pip install -e .

update:
	@test -x .venv/bin/python || { echo "Сначала выполните: make install"; exit 1; }
	.venv/bin/python -m pip install -U pip
	.venv/bin/python -m pip install -U -e .

run:
	@test -x .venv/bin/hh-applicant-gui || { echo "Сначала выполните: make install"; exit 1; }
	.venv/bin/hh-applicant-gui
