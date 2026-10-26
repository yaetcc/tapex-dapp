#!/usr/bin/env bash
# 一键发布：构建 → 复制到发布仓 → 提交 → 推送 → 轮询线上直到生效
# 用法：bash scripts/release.sh "feat: 说明"
set -euo pipefail
MSG="${1:-chore: 自动发布}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$APP/../.work/tapex-dapp"
SITE="${SITE:-https://tapex.live}"

export PATH="/Users/yaetc/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"

echo "▶ 构建"
cd "$APP"
./node_modules/.bin/tsc -b >/dev/null 2>&1 || echo "  (tsc 有告警，继续)"
node scripts/build.mjs | tail -2
JS=$(ls -t dist/assets/app.*.js | head -1 | xargs basename)

echo "▶ 同步到发布仓"
cp -R src/. "$REPO/src/"
cp scripts/build.mjs "$REPO/scripts/build.mjs"
cp index.html "$REPO/index.html"
cd "$REPO"
git add -A
if git diff --cached --quiet; then
  echo "  无代码变更，跳过提交"
else
  git -c user.name=yaetcc -c user.email=yaetcc@users.noreply.github.com commit -q -m "$MSG"
  echo "  已提交：$(git log -1 --format='%h %s')"
fi

echo "▶ 推送"
git push origin main 2>&1 | tail -1

echo "▶ 等待线上生效（最多 5 分钟）"
for i in $(seq 1 10); do
  sleep 30
  LIVE=$(curl -s -m 20 "$SITE/?v=$RANDOM" | grep -o 'assets/app\.[a-f0-9]*\.js' | head -1 | xargs -r basename || true)
  echo "  [$((i*30))s] 线上=$LIVE 期望=$JS"
  if [ "$LIVE" = "$JS" ]; then
    echo "✅ 已发布：$SITE （$JS）"
    exit 0
  fi
done
echo "⚠ 超时：线上仍是 $LIVE —— 去 Vercel 看部署状态"
exit 1
