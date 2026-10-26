#!/usr/bin/env bash
# 发布到 GitHub Pages（不经过 Vercel）
# 把构建产物推到 gh-pages 分支；仓库 Settings → Pages 选择 gh-pages 分支即可。
# 用法：bash scripts/publish-gh.sh "feat: 说明"
set -euo pipefail
MSG="${1:-chore: publish}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/Users/yaetc/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin:$PATH"

# 构建在源工程里做（它有 node_modules），再把产物搬过来
SRC="${SRC_APP:-/Users/yaetc/Documents/deepseek-harness/default-workspace/tapex-app}"
cd "$SRC"
echo "▶ 构建（$SRC）"
node scripts/build.mjs | tail -1
rm -rf "$APP/dist"
cp -R dist "$APP/dist"
# 只保留 index 引用的产物，避免历史哈希文件堆积
for f in "$APP"/dist/assets/app.*.js "$APP"/dist/assets/app.*.css; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  grep -q "$base" "$APP/dist/index.html" || rm -f "$f"
done
touch "$APP/dist/.nojekyll"
[ -f "$APP/CNAME" ] && cp "$APP/CNAME" "$APP/dist/CNAME"
cd "$APP"

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
