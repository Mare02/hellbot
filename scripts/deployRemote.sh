#!/usr/bin/env bash
set -euo pipefail

stage="${1:-}"
case "$stage" in
  prepare|install|build|migrate|restart|verify|register|notify) ;;
  *) echo 'Unknown deployment stage.' >&2; exit 1 ;;
esac
[[ "${DEPLOY_SHA:-}" =~ ^[a-f0-9]{40}$ ]]
[[ "${DEPLOY_RUN_ID:-}" =~ ^[1-9][0-9]*$ ]]
[[ "${DEPLOY_RUN_ATTEMPT:-}" =~ ^[1-9][0-9]*$ ]]

ssh -o BatchMode=yes hellbot@93.127.160.57 \
  "bash -l -i -c 'exec bash -euo pipefail -s -- $stage $DEPLOY_SHA $DEPLOY_RUN_ID $DEPLOY_RUN_ATTEMPT'" <<'REMOTE'
set -euo pipefail
stage="$1"
export NODE_ENV=production
export DEPLOY_SHA="$2"
export DEPLOY_RUN_ID="$3"
export DEPLOY_RUN_ATTEMPT="$4"
cd /home/hellbot/projects/hellbot

test -z "$(git status --porcelain)"
if [ "$stage" = prepare ]; then
  git fetch origin main
  git merge-base --is-ancestor "$DEPLOY_SHA" origin/main
  git merge --ff-only "$DEPLOY_SHA"
fi
test "$(git rev-parse HEAD)" = "$DEPLOY_SHA"

case "$stage" in
  prepare)
    test "$(pnpm --version)" = '12.6.0'
    ;;
  install)
    pnpm install --frozen-lockfile --prod=false
    ;;
  build)
    pnpm run dashboard:build
    ;;
  migrate)
    pnpm run db:migrate
    ;;
  restart)
    pm2 restart hellbot --update-env
    if pm2 describe hellbot-dashboard >/dev/null 2>&1; then
      pm2 restart hellbot-dashboard --update-env
    else
      pm2 start src/dashboard/server.js --name hellbot-dashboard --cwd "$PWD"
    fi
    pm2 save
    ;;
  verify)
    node scripts/recordDeployment.js
    ;;
  register)
    node -e 'require("./src/commands/slashCommands/updateslashcommands").execute(null, true).catch(() => { console.error("Slash-command registration failed."); process.exitCode = 1; })'
    ;;
  notify)
    commit_message="$(git log -1 --format=%s)"
    COMMIT_MESSAGE="$commit_message" node scripts/announceDeployment.js
    ;;
esac
REMOTE
