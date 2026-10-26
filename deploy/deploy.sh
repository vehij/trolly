#!/usr/bin/env bash
# انتشار نسخه‌ی جدید از روی کامپیوتر محلی روی یک سرور (بدون نیاز به اینترنت/گیت‌هاب روی سرور)
# استفاده:  deploy/deploy.sh <ssh-host> <cpanel-user>
#   مثال:   deploy/deploy.sh soozanban-eu soozanban
# <ssh-host> نام میزبان در ~/.ssh/config است (با پورت و کلید درست).
set -euo pipefail
HOST="${1:?ssh host}"
USER_="${2:?cpanel user}"
APP="/home/${USER_}/soozanban"
cd "$(dirname "$0")/.."

npm test
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude data --exclude .env --exclude test \
  ./ "${HOST}:${APP}/"
ssh "$HOST" "chown -R ${USER_}:${USER_} ${APP} && systemctl restart soozanban && sleep 2 && systemctl is-active soozanban && curl -fsS http://127.0.0.1:3700/healthz"
echo "✅ ${HOST} به‌روز شد"
