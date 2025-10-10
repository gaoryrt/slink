// Cloudflare Worker for slink
// Endpoints:
// - POST /api/create   { content, key, filename? } -> { short: <7-8 chars>, commitHash }
// - GET  /api/resolve?hash=<hash>                  -> { content }
// - GET  /:hash                                     -> redirects (if content is URL) or shows text

import { HEX_RE } from "./back/utils.js";
import {
  handleCreate,
  handleResolve,
  redirectByPatch,
} from "./back/handlers.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname, searchParams } = url;

      if (pathname === "/") {
        // 返回 index.html 文件内容
        return env.ASSETS.fetch(request);
      }

      if (pathname.startsWith("/api/create") && request.method === "POST") {
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
          return json({ error: `invalid hash or key` }, 400);
        return redirectByPatch(hash, key, env);
      }

      // Legacy hash route: /:hash (for backward compatibility)
      if (pathname.length > 1 && pathname.indexOf("/", 1) === -1) {
        const hash = pathname.slice(1);
        if (!HEX_RE.test(hash)) return json({ error: `invalid hash` }, 400);
        // For legacy URLs without key, return a simple page asking for key
      }
      return json({ error: `you should use /${hash}/{yourkey}` }, 400);
    } catch (error) {
      return json({ error: "internal server error" }, 500);
    }
  },
};
