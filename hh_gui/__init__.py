"""Local control panel for the hh-applicant-tool console utility."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("hh-applicant-gui")
except PackageNotFoundError:
    __version__ = "0.1.0"
