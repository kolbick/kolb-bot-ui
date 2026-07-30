#!/bin/sh
set -eu

APP_PY="$(python3 -c 'import importlib.util; print(importlib.util.find_spec("cptr.app").origin)')"
CONFIG_PY="$(python3 -c 'import importlib.util; print(importlib.util.find_spec("cptr.utils.config").origin)')"
CONFIG_TOML="/data/config.toml"

# Cloudflare Access is the identity boundary; cptr trusts its verified email header.
if ! grep -q 'trusted_header' "$CONFIG_TOML" 2>/dev/null; then
    printf '[auth]\nmode = "trusted_header"\nheader = "Cf-Access-Authenticated-User-Email"\n' > "$CONFIG_TOML"
    echo "cptr: configured Cloudflare Access trusted-header authentication"
fi

python3 - "$APP_PY" "$CONFIG_PY" <<'PYEOF'
import sys

app_path, config_path = sys.argv[1], sys.argv[2]

# cptr 0.9.15 only verifies JWT cookies in password/PAM mode. Accept a valid
# JWT first in every mode, allowing trusted-header bootstrap to feed existing
# route helpers that only pass cptr_session to check_access().
with open(config_path, encoding="utf-8") as file:
    config_source = file.read()

marker = "# CF_PATCH: accept JWT in any mode"
if marker not in config_source:
    old = '''    mode = get_auth_mode()

    # Password and PAM: verify JWT cookie
    if mode in (AuthMode.PASSWORD, AuthMode.PAM):
        if jwt_token:
            return verify_token(jwt_token)
        return None'''
    new = '''    mode = get_auth_mode()

    # CF_PATCH: accept JWT in any mode. Trusted-header bootstrap mints a
    # regular cptr_session cookie; per-route helpers only pass that cookie.
    if jwt_token:
        verified = verify_token(jwt_token)
        if verified:
            return verified

    # Password and PAM require a valid JWT cookie.
    if mode in (AuthMode.PASSWORD, AuthMode.PAM):
        return None'''
    if old not in config_source:
        raise SystemExit("cptr config.py changed: check_access patch target not found")
    with open(config_path, "w", encoding="utf-8", newline="\n") as file:
        file.write(config_source.replace(old, new, 1))
    print("cptr: patched JWT verification for trusted-header sessions")

# Bootstrap a normal cptr_session cookie from Cloudflare's authenticated email.
# Defined after auth_middleware because Starlette executes middleware in reverse
# declaration order. A 307 repeats the request after the browser stores the JWT.
with open(app_path, encoding="utf-8") as file:
    app_source = file.read()

if "cf_access_cookie_middleware" not in app_source:
    replacements = [
        (
            "from fastapi.responses import FileResponse, JSONResponse",
            "from fastapi.responses import FileResponse, JSONResponse, RedirectResponse",
        ),
        (
            "from cptr.utils.config import check_access, load_config",
            "from cptr.utils.config import check_access, create_token, load_config, SESSION_MAX_AGE\n\nCOOKIE_NAME = \"cptr_session\"",
        ),
    ]
    for old, new in replacements:
        if old not in app_source:
            raise SystemExit(f"cptr app.py changed: import patch target not found: {old}")
        app_source = app_source.replace(old, new, 1)

    anchor = "# CORS middleware"
    middleware = '''# Cloudflare Access cookie-bootstrap middleware.
# Defined after auth_middleware so Starlette executes it before auth.
@app.middleware("http")
async def cf_access_cookie_middleware(request: Request, call_next):
    config = load_config()
    header_name = config.get("auth", {}).get("header", "")
    email = request.headers.get(header_name) if header_name else None
    existing = request.cookies.get(COOKIE_NAME)
    existing_auth = None
    if existing:
        existing_auth = check_access(
            client_host=request.client.host if request.client else "127.0.0.1",
            jwt_token=existing,
        )
    if email and not existing_auth:
        from cptr.utils.config import get_or_create_user
        from cptr.models import User

        user_id = await get_or_create_user(email)
        if user_id:
            user = await User.get_by_id(user_id)
            role = user.role if user and user.role != "pending" else "user"
            token = create_token(user_id, email, role=role)
            response = RedirectResponse(url=str(request.url), status_code=307)
            response.set_cookie(
                key=COOKIE_NAME,
                value=token,
                httponly=True,
                samesite="lax",
                secure=True,
                path="/",
                max_age=SESSION_MAX_AGE,
            )
            return response
    return await call_next(request)


'''
    if anchor not in app_source:
        raise SystemExit("cptr app.py changed: middleware anchor not found")
    with open(app_path, "w", encoding="utf-8", newline="\n") as file:
        file.write(app_source.replace(anchor, middleware + anchor, 1))
    print("cptr: patched Cloudflare Access session bootstrap")
PYEOF

find "$(dirname "$APP_PY")" -path '*__pycache__/app*.pyc' -delete 2>/dev/null || true
find "$(dirname "$CONFIG_PY")" -path '*__pycache__/config*.pyc' -delete 2>/dev/null || true

exec cptr "$@"
