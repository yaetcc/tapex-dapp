#!/usr/bin/env bash
# 发布到 GitHub Pages（不经过 Vercel）
# 把构建产物推到 gh-pages 分支；仓库 Settings → Pages 选择 gh-pages 分支即可。
# 用法：bash scripts/publish-gh.sh "feat: 说明"
set -euo pipefail
MSG="${1:-chore: publish}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/Users/yaetc/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"

cd "$APP"
echo "▶ 构建"
./node_modules/.bin/tsc -b >/dev/null 2>&1 || true
node scripts/build.mjs | tail -1
touch dist/.nojekyll

echo "▶ 推到 gh-pages"
cd dist
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name=yaetcc -c user.email=yaetcc@users.noreply.github.com commit -q -m "$MSG"
git remote add origin https://github.com/yaetcc/tapex-dapp.git
git push -f origin gh-pages
echo "✅ 已推送 gh-pages：$(ls assets/app.*.js | head -1)"
