"""Tests for server-side browser artifact URL construction."""

from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_browser_artifact_module():
    artifact_path = Path(__file__).resolve().parents[1] / 'open_webui' / 'utils' / 'browser_artifact.py'
    artifact_spec = importlib.util.spec_from_file_location('browser_artifact_test', artifact_path)
    artifact_module = importlib.util.module_from_spec(artifact_spec)
    assert artifact_spec.loader is not None
    artifact_spec.loader.exec_module(artifact_module)
    return artifact_module


def test_build_url_without_password(monkeypatch):
    monkeypatch.setenv('BROWSER_ARTIFACT_VNC_PATH', '/browser/vnc.html?autoconnect=1&resize=scale')
    monkeypatch.delenv('BROWSER_VNC_PASSWORD', raising=False)
    module = _load_browser_artifact_module()
    url = module.build_browser_artifact_url()
    assert url == '/browser/vnc.html?autoconnect=1&resize=scale'
    assert 'password=' not in url


def test_build_url_with_password_from_env(monkeypatch):
    monkeypatch.setenv('BROWSER_ARTIFACT_VNC_PATH', '/browser/vnc.html?autoconnect=1')
    monkeypatch.setenv('BROWSER_VNC_PASSWORD', 'test-secret')
    module = _load_browser_artifact_module()
    url = module.build_browser_artifact_url(chat_id='chat-1')
    assert url.startswith('/browser/vnc.html?autoconnect=1&chat_id=chat-1')
    assert url.endswith('#password=test-secret')
