# Workstation Links — Design

Date: 2026-07-29
Branch: `upgrade/kolb-bot-v0.11.0`

## Problem

Kolby and Abby each have their own isolated cptr workstation container
(`cptr-kolb`, `cptr-abby` — see `docker-compose.yaml`). There is currently no way
to reach them from inside Kolb-Bot: you have to know the port and type the URL by
hand. They should each get a button in the sidebar that opens *their* workstation,
and Kolby should be able to change who sees what without a code change or an image
rebuild.

## Scope

In scope:

- A new admin-editable list of "workstations" (name + URL + which users may see it).
- An admin UI to manage that list.
- A sidebar button per workstation the current user is allowed to see.

Out of scope (deliberately):

- Exposing the cptr containers remotely. That is Cloudflare/tunnel work, tracked
  separately; this feature is URL-agnostic so the URLs can change later with no
  code change.
- Per-workstation icons, drag-reordering, health/status indicators, embedding cptr
  in an iframe, or auto-provisioning new cptr containers.

## Data model

One new config key, `ui.workstations`, holding a list:

```json
[
  {
    "id": "cptr-kolb",
    "name": "Kolb Workstation",
    "url": "http://localhost:8003",
    "user_ids": ["86345aa3-4dc1-4342-bcf2-ac378c624429"]
  },
  {
    "id": "cptr-abby",
    "name": "Abby Workstation",
    "url": "http://localhost:8004",
    "user_ids": ["31213c77-6b09-4834-b300-74a4fccb29c5"]
  }
]
```

`user_ids` is an explicit allow-list of user IDs. An empty list means nobody but
admins. This mirrors the shape already used by `terminal_server.connections`,
which carries per-connection `access_grants`.

Admins always see every workstation, so Kolby can open Abby's to help her
troubleshoot without granting himself an entry in each list.

Storing URLs (not container names or ports) is what makes the later switch to
`https://cptr.kolb-bot.com` a text-field edit rather than a code change.

## Backend

`backend/open_webui/routers/configs.py` gains a pair of endpoints modelled on the
existing `GET/POST /tool_servers`:

- `GET /api/v1/configs/workstations` — returns the full list. `get_admin_user`.
- `POST /api/v1/configs/workstations` — replaces the full list. `get_admin_user`.

Validation on write: `name` non-empty, `url` non-empty and parseable as http/https.
Entries failing validation are rejected with a 400 rather than silently dropped.

`GET /api/config` (in `main.py`) gains a `workstations` key. This endpoint is
already the mechanism the sidebar uses for feature flags, and it already resolves
the calling user, so the filtering happens there:

- Anonymous / no user: omit the key entirely.
- Admin: all entries.
- Regular user: only entries whose `user_ids` contains their ID.

Only `{name, url}` is sent to the client — `user_ids` is admin-only data and stays
server-side.

## Frontend

**Admin panel** — a "Workstations" section in
`src/lib/components/admin/Settings/Interface.svelte`: a row per workstation with
Name, URL, and a user multi-select, plus add/remove. Saving calls the POST above.

**Sidebar** — `src/lib/components/layout/Sidebar.svelte` already renders menu items
from a `{label, href, iconType}` shape gated by a per-item visibility check
(lines ~183-200). Workstations render as additional items in that same list,
sourced from `$config.workstations`, opening in a new tab
(`target="_blank" rel="noopener noreferrer"`).

If `workstations` is absent or empty, nothing renders — no empty section, no
placeholder.

## Error handling

- Unreachable workstation URL: not our problem to detect. The button is a plain
  link; the browser shows its own error. No health-checking (explicitly out of
  scope — it would mean polling every workstation on every page load).
- Malformed config (hand-edited into a bad state): the `/api/config` filter treats
  a non-list value as empty and logs a warning, rather than 500-ing the whole
  config endpoint and breaking the app for everyone.

## Testing

Vitest, against the filter logic:

- Regular user sees only workstations listing their ID.
- Regular user with no matching entries sees none.
- Admin sees all entries regardless of `user_ids`.
- Absent / empty / malformed config yields an empty list, no throw.
- `user_ids` is never present in the client payload.

## Migration / rollout

No database migration — `ui.workstations` is a new key in the existing config
table and is absent until first written, which the filter treats as empty.

Seeded initially with the two entries above pointing at `localhost`. When the
Cloudflare work lands, those URLs get edited in the admin panel; no redeploy.
