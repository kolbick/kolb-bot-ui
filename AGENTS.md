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

The same compose project also runs these containers (all defined in the compose files above):

- `ollama` — local model runtime, GPU passthrough (`gpus: all`), port `127.0.0.1:11434`. Volume
  bind-mounted to `C:\Users\sshkolby\.ollama`.
- `docling` — document extraction/OCR service backing `CONTENT_EXTRACTION_ENGINE=docling`, port
  `5001`.
- `comfyui` — image generation, **also `gpus: all` on the same physical card as `ollama`** (one
  RTX 3080, 10GB VRAM). No host port mapping; reached internally at `http://comfyui:8188`. Running
  Ollama and ComfyUI workloads at the same time contends for the same VRAM pool.
- `open-terminal-kolb` / `open-terminal-abby` — sandboxed terminal/computer-use backends for the
  two preset agents, ports `8001`/(container-internal, see `open-terminal-abby`).
- `cptr-kolb` / `cptr-abby` — isolated workstation containers, loopback-only
  (`127.0.0.1:8003`/`127.0.0.1:8004`), patched at startup by `docker/cptr-fix/apply-patch.sh` to
  trust Cloudflare Access's verified email header. See `CLAUDE.md` for why the patch exists.
- `minimax-image-mcpo` — MCP-to-OpenAPI bridge for the Minimax image tool.

Verify the actual live set with `docker ps` — this list is a snapshot and containers get added/
removed as the setup evolves.

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

Active ingress in `C:\ProgramData\cloudflared\config.yml` routes (verified 2026-07-31 — this had
drifted from what was documented here before, so re-check the live file rather than trusting this
list blindly next time too):

- `kolb-bot.com` and `www.kolb-bot.com` -> `http://localhost:3000` (this repo's `open-webui`)
- `cptr.kolb-bot.com` -> `http://localhost:8003` (`cptr-kolb`, Cloudflare Access-gated)
- `abby.kolb-bot.com` -> `http://localhost:8004` (`cptr-abby`, Cloudflare Access-gated)
- `tide-bot.com` and `www.tide-bot.com` -> `http://localhost:3102` (the `tide-bot` container —
  **not** `tidebot-open-webui`, which is a separate container also running on `3001` but is not
  what the tunnel currently points at; worth reconciling if that's not intentional)
- `/browser*` on `kolb-bot.com`/`tide-bot.com` (and `www.` variants) -> `http://localhost:6081`

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
docker inspect open-webui --format '{{.Created}}'
git log -1 --format="%H %cI %s"
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000 -TimeoutSec 20
```

Don't assume the running container matches HEAD just because a build succeeded recently — the
`package.json` version string doesn't change between commits, so it can't tell you that by itself.
Compare `docker inspect open-webui --format '{{.Created}}'` against `git log -1 --format=%cI`.
Caught a real case (2026-07-30/31) where the container was built ~40 minutes *before* the latest
commit landed, so it was silently serving stale code despite looking healthy.
