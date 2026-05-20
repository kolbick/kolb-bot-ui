"""Browser artifact configuration for agent workspace (noVNC)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from open_webui.utils.auth import get_verified_user
from open_webui.utils.browser_artifact import build_browser_artifact_url
from pydantic import BaseModel

router = APIRouter()


class BrowserArtifactUrlResponse(BaseModel):
    url: str


@router.get('/artifact-url', response_model=BrowserArtifactUrlResponse)
async def get_browser_artifact_url(
    chat_id: str | None = Query(None),
    user=Depends(get_verified_user),
):
    """Return the noVNC viewer URL for the authenticated user (password from server env only)."""
    return BrowserArtifactUrlResponse(url=build_browser_artifact_url(chat_id=chat_id))
