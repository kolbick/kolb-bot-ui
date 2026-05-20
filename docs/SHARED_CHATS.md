# Shared chat access

`GET /api/v1/chats/share/{share_id}` allows **optional authentication** so public shares can be read without logging in first.

## Access rules

1. The share record must exist (`SharedChats.get_by_id`).
2. If the caller is not the share owner:
   - A **public read grant** (`AccessGrants.has_access` with `user_id='*'`) allows anonymous access.
   - Otherwise an authenticated user needs a matching read grant, or admin access when `ENABLE_ADMIN_CHAT_ACCESS` is enabled.
3. Anonymous users without a public grant receive `401` with `ACCESS_PROHIBITED`.

## Security notes

- Shared chat payloads should not include secrets (API keys, terminal tokens, or raw browser VNC passwords).
- Browser viewer URLs are served via `GET /api/v1/browser/artifact-url` for authenticated users only; credentials come from server environment variables (`BROWSER_VNC_PASSWORD`).
