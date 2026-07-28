#!/bin/sh
set -eu

export HOME=/home/Kolb-Bot
export PATH=/home/Kolb-Bot/.local/bin:/home/user/.local/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin

if [ "$(id -u)" = "0" ]; then
  usermod -aG sudo Kolb-Bot
  if [ -n "${KOLB_BOT_PASSWORD:-}" ]; then
    printf 'Kolb-Bot:%s\n' "$KOLB_BOT_PASSWORD" | chpasswd
  fi
  mkdir -p /run/sshd
  /usr/sbin/sshd

  if command -v /usr/local/bin/start-hermes-gateway.sh >/dev/null 2>&1; then
    runuser -u Kolb-Bot -- env HOME=/home/Kolb-Bot PATH="$PATH" /usr/local/bin/start-hermes-gateway.sh || true
  fi

  exec runuser -u Kolb-Bot -- env HOME=/home/Kolb-Bot PATH="$PATH" /app/entrypoint.sh "$@"
fi

if command -v /usr/local/bin/start-hermes-gateway.sh >/dev/null 2>&1; then
  /usr/local/bin/start-hermes-gateway.sh || true
fi
exec /app/entrypoint.sh "$@"
