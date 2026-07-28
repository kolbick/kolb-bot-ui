# Live Docker Orchestration

This folder (`C:\Users\sshkolby\open-webui`, branch `Kolb-Bot`) is both the source checkout AND
the live Docker orchestration workspace for the local Kolb-Bot stack.

## What Runs From Here

- Kolb-Bot app container: `open-webui`
- Local URL: `http://localhost:3000`
- Public domain: `https://kolb-bot.com`
- Persistent data volume: `open-webui_open-webui` mounted at `/app/backend/data`
- Compose files:
  - `C:\Users\sshkolby\open-webui\docker-compose.yaml`
  - `C:\Users\sshkolby\open-webui\docker-compose.override.yaml`

## Build Context

`docker-compose.override.yaml` builds `open-webui` from `.` (this repo, whatever branch is
checked out — normally `Kolb-Bot`). The previous dual-worktree setup that built from a second
checkout at `C:\Users\sshkolby\kolb-bot-live` was retired 2026-07-28 — that directory is no
longer used as a build source. Make sure the working tree here is clean/on the right branch
before rebuilding, since dirty files now do get baked into the image.

## Related Live Source Folders

- Tide-Bot source: `C:\Users\sshkolby\tide-bot-live`
- (Retired) old Kolb-Bot dual-worktree: `C:\Users\sshkolby\kolb-bot-live` — no longer referenced
  by compose; kept on disk only until manually removed. It had a few untracked items worth a
  look before deletion: `mockups/home-mission-control.html`, `.claude/`, `.geminiignore`.

## Cloudflare

Cloudflare is running as a Windows service:

- Service name: `Cloudflared`
- Process path: `C:\Program Files (x86)\cloudflared\cloudflared.exe`
- Active service config: `C:\ProgramData\cloudflared\config.yml`
- Tunnel ID: `113e4587-6cf6-4cbf-9a56-4572c3b45be2`

Active ingress in `C:\ProgramData\cloudflared\config.yml` routes:

- `kolb-bot.com` and `www.kolb-bot.com` -> `http://localhost:3000`
- `tide-bot.com` and `www.tide-bot.com` -> `http://localhost:3001`
- `/browser*` on both domains -> `http://localhost:6081`

There is also a user config at `C:\Users\sshkolby\.cloudflared\config.yml`, but the Windows service uses the ProgramData config unless the service definition is changed. Do not commit tunnel credential JSON files or secrets.

## Before Rebuilding

Run these checks first:

```powershell
git -C C:\Users\sshkolby\kolb-bot-live status --short
git -C C:\Users\sshkolby\tide-bot-live status --short
docker ps --filter name=open-webui --filter name=tidebot-open-webui --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

After rebuilding, verify:

```powershell
docker exec open-webui python -c "import json,pathlib; print(json.loads(pathlib.Path('/app/package.json').read_text())['version'])"
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000 -TimeoutSec 20
```
