.PHONY: install run

install:
	python3 -m venv .venv
	.venv/bin/python -m pip install -U pip
	.venv/bin/python -m pip install -e .

run:
	@test -x .venv/bin/hh-applicant-gui || { echo "Сначала выполните: make install"; exit 1; }
	.venv/bin/hh-applicant-gui
