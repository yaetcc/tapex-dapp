// 备用构建：本机 Node 与 rollup 原生模块签名冲突时用它（Vercel 上直接用 vite build）
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, cpSync, renameSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const out = "dist";
mkdirSync(out + "/assets", { recursive: true });

await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  outfile: out + "/assets/app.js",
  loader: { ".css": "css" },
  define: { "process.env.NODE_ENV": '"production"' },
});

// 内容哈希文件名：避免 CDN 用旧缓存（/assets/app.js 这种固定名会被长期缓存）
const hashOf = (file) => createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
const jsHash = hashOf(out + "/assets/app.js");
const jsName = `app.${jsHash}.js`;
renameSync(out + "/assets/app.js", out + "/assets/" + jsName);
let cssName = null;
if (existsSync(out + "/assets/app.css")) {
  const cssHash = hashOf(out + "/assets/app.css");
  cssName = `app.${cssHash}.css`;
  renameSync(out + "/assets/app.css", out + "/assets/" + cssName);
}

const html = readFileSync("index.html", "utf8")
  .replace('<script type="module" src="/src/main.tsx"></script>',
    (cssName ? `<link rel="stylesheet" href="/assets/${cssName}" />\n    ` : "") +
    `<script type="module" src="/assets/${jsName}"></script>`);
writeFileSync(out + "/index.html", html);
console.log("hashed assets:", cssName ?? "(no css)", jsName);
// 拷贝 public/ 下的静态资源（logo 等）
try {
  cpSync("public", out, { recursive: true });
  console.log("copied public/ → dist/");
} catch {}
console.log("built → dist/");
