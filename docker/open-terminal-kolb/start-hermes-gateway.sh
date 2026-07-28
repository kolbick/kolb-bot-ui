#!/bin/sh
set -eu

HERMES_HOME="${HOME}/.hermes"
ENV_FILE="${HERMES_HOME}/.env"
LOG_DIR="${HERMES_HOME}/logs"

mkdir -p "${LOG_DIR}"
touch "${ENV_FILE}"

upsert() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s#^${key}=.*#${key}=${value}#" "${ENV_FILE}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

upsert "API_SERVER_ENABLED" "true"
upsert "API_SERVER_HOST" "0.0.0.0"
upsert "API_SERVER_PORT" "8642"
upsert "API_SERVER_MODEL_NAME" "Kolb-Bot"
upsert "API_SERVER_KEY" "${API_SERVER_KEY:?API_SERVER_KEY env var must be set}"

pkill -TERM -f '/home/user/.hermes/hermes-agent/venv/bin/hermes gateway run' 2>/dev/null || true
sleep 1

set -a
. "${ENV_FILE}"
set +a

nohup /home/Kolb-Bot/.local/bin/hermes gateway run --replace >"${LOG_DIR}/gateway.log" 2>"${LOG_DIR}/errors.log" < /dev/null &
