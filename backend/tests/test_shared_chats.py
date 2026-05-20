"""Tests for public shared-chat access on GET /api/v1/chats/share/{share_id}."""

from __future__ import annotations

from pathlib import Path


def _chats_router_source() -> str:
    chats_path = Path(__file__).resolve().parents[1] / 'open_webui' / 'routers' / 'chats.py'
    return chats_path.read_text(encoding='utf-8')


def test_shared_chat_endpoint_uses_optional_auth():
    source = _chats_router_source()
    assert 'get_optional_verified_user' in source
    endpoint_block = source.split('async def get_shared_chat_by_id')[1].split('async def ')[0]
    assert 'get_verified_user' not in endpoint_block.split('Depends')[0]


def test_shared_chat_checks_public_grant_for_anonymous_users():
    source = _chats_router_source()
    endpoint_block = source.split('async def get_shared_chat_by_id')[1].split('async def ')[0]
    assert "user_id='*'" in endpoint_block or 'user_id="*"' in endpoint_block
    assert 'if not user:' in endpoint_block
    assert 'has_public_grant' in endpoint_block
