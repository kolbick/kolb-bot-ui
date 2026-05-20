"""Build noVNC browser artifact URLs from server-side configuration."""

from __future__ import annotations

import os

_DEFAULT_VNC_PATH = (
    '/browser/vnc.html?autoconnect=1&resize=scale&reconnect=1&reconnect_delay=1000&path=browser/websockify'
)


def _browser_artifact_vnc_path() -> str:
    return os.getenv('BROWSER_ARTIFACT_VNC_PATH', _DEFAULT_VNC_PATH)


def _browser_vnc_password() -> str:
    return os.getenv('BROWSER_VNC_PASSWORD', '')


def build_browser_artifact_url(chat_id: str | None = None) -> str:
    """Return the noVNC viewer URL. VNC password is appended only from env."""
    base = _browser_artifact_vnc_path().rstrip('/')
    if chat_id:
        separator = '&' if '?' in base else '?'
        base = f'{base}{separator}chat_id={chat_id}'

    password = _browser_vnc_password()
    if password:
        return f'{base}#password={password}'

    return base
