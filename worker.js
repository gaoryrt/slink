// Cloudflare Worker for slink
// Endpoints:
// - POST /api/create   { content, key, filename? } -> { short: <7-8 chars>, commitHash }
// - GET  /api/resolve?hash=<hash>                  -> { content }
// - GET  /:hash                                     -> redirects (if content is URL) or shows text

import { HEX_RE } from "./utils.js";
import { handleCreate, handleResolve, redirectByPatch } from "./handlers.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname, searchParams } = url;

      console.log(`[Worker] 收到请求 - ${request.method} ${pathname}`);
      console.log(
        `[Worker] 请求头 - User-Agent: ${request.headers.get(
          "User-Agent"
        )}, Origin: ${request.headers.get("Origin")}`
      );

      if (pathname === "/") {
        // 返回 index.html 文件内容
        return env.ASSETS.fetch(request);
      }

      if (pathname.startsWith("/api/create") && request.method === "POST") {
        console.log("[Worker] 路由到 /api/create 处理器");
        return handleCreate(request, env);
      }

      if (pathname.startsWith("/api/resolve")) {
        const hash = searchParams.get("hash") || pathname.split("/").pop();
        return handleResolve(hash, env, request);
      }

      // Hash route: /:hash/:key
      const pathParts = pathname.slice(1).split("/");
      if (pathParts.length === 2) {
        const [hash, key] = pathParts;
        if (!HEX_RE.test(hash) || !key)
          return Response.redirect(env.DEFAULT_URL);
        return redirectByPatch(hash, key, env);
      }

      // Legacy hash route: /:hash (for backward compatibility)
      if (pathname.length > 1 && pathname.indexOf("/", 1) === -1) {
        const hash = pathname.slice(1);
        if (!HEX_RE.test(hash)) return Response.redirect(env.DEFAULT_URL);
        // For legacy URLs without key, return a simple page asking for key
        const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>slink ${hash}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}input,button{font:inherit;padding:8px;margin:4px}button{background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer}</style>
</head>
<body>
<h1>slink</h1>
<p>hash: <code>${hash}</code></p>
<p>请使用新的URL格式: <code>/${hash}/你的密钥</code></p>
<p>或者输入密钥:</p>
<label>Key <input id="key" type="password" autofocus /></label>
<button onclick="go()">Go</button>
<script>
function go() {
  const key = document.getElementById('key').value;
  if (key) {
    window.location.href = '/${hash}/' + encodeURIComponent(key);
  }
}
</script>
</body></html>`;
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("[Worker] 未处理的错误:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
          stack: error.stack,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
