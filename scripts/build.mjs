// 备用构建：本机 Node 与 rollup 原生模块签名冲突时用它（Vercel 上直接用 vite build）
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";

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

const html = readFileSync("index.html", "utf8")
  .replace('<script type="module" src="/src/main.tsx"></script>',
           '<link rel="stylesheet" href="/assets/app.css" />\n    <script type="module" src="/assets/app.js"></script>');
writeFileSync(out + "/index.html", html);
// 拷贝 public/ 下的静态资源（logo 等）
try {
  cpSync("public", out, { recursive: true });
  console.log("copied public/ → dist/");
} catch {}
console.log("built → dist/");
