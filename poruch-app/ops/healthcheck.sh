#!/usr/bin/env sh
set -eu

URL="${PORUCH_HEALTH_URL:-https://app.173.242.49.73.nip.io/readyz}"
curl --fail --silent --show-error --max-time 15 "$URL" >/dev/null
