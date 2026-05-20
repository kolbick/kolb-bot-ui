# Kolb-Bot fork guide

Kolb-Bot is a rebranded fork of [Open WebUI](https://github.com/open-webui/open-webui). This document lists fork-specific behavior and how to maintain the tree.

## Fork-specific features

| Area | Location |
|------|----------|
| Agent workspace (browser, steps, terminal) | `src/lib/components/chat/AgentWorkspace.svelte` |
| Agent browser shell UI | `src/lib/components/chat/AgentBrowserShell.svelte` |
| Browser agent helpers | `src/lib/chat/browserAgent.ts`, `src/lib/utils/agentBrowser.ts` |
| Browser artifact URL API | `backend/open_webui/routers/browser.py` |
| Public shared-chat auth | `backend/open_webui/routers/chats.py` (`get_optional_verified_user`) |
| Branding | `src/lib/constants.ts`, `backend/open_webui/env.py` (`WEBUI_NAME`) |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `WEBUI_NAME` | Display name (default: `Kolb-Bot`) |
| `BROWSER_ARTIFACT_VNC_PATH` | noVNC viewer path and query string (no password) |
| `BROWSER_VNC_PASSWORD` | VNC password appended server-side only |
| `PLAYWRIGHT_WS_URL` | Playwright server for web loader / agent (see `docker-compose.playwright.yaml`) |

## Upstream sync

1. Fetch upstream Open WebUI tags regularly.
2. Merge or rebase `main` from upstream, resolving conflicts in fork files above first.
3. Re-run `npm run test:frontend`, `npm run test:agent`, and `pytest backend/tests`.
4. Update `CHANGELOG.md` and version in `package.json` / `pyproject.toml` together.

## Versioning

Release version is defined in `package.json` (currently aligned with upstream Open WebUI release numbering).
