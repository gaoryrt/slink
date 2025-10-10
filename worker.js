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
        return json(
          {
            error: `an URL without key detected, try again like /${hash}/{yourkey}`,
          },
          400
        );
      }
      return json({ error: "not found" }, 404);
    } catch (error) {
      console.error("[Worker] 未处理的错误:", error);
      return json({ error: "internal server error" }, 500);
    }
  },
};
