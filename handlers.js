// 请求处理函数模块
import {
  isSameOrigin,
  json,
  HEX_RE,
  extractPayloadLineFromPatch,
} from "./utils.js";
import { encryptWithPassword, decryptWithPassword } from "./crypto.js";
import { commitEmptyToGitHub } from "./github.js";

/**
 * 处理创建短链接请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export async function handleCreate(request, env) {
  // 检查CORS - 只允许本域请求
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");

  if (origin && !isSameOrigin(origin, host)) {
    return json({ error: "CORS: Origin not allowed" }, 403);
  }

  try {
    const body = await request.json();
    const content = String(body.content || "");
    const key = String(body.key || "");

    if (!content || !key) {
      return json({ error: "missing content or key" }, 400);
    }

    // Encrypt content with key
    const { cipherTextBase64, ivBase64, saltBase64, algo } =
      await encryptWithPassword(content, key);
    const payload = JSON.stringify({
      v: 1,
      algo,
      salt: saltBase64,
      iv: ivBase64,
      c: cipherTextBase64,
    });

    // Commit to GitHub repository (empty commit with content in subject)
    const commit = await commitEmptyToGitHub(env, payload);

    if (!commit?.sha) {
      return json({ error: "commit failed" }, 500);
    }

    const short = commit.sha.slice(0, 4);
    return json({ short, commitHash: commit.sha, gitRepo: env.GIT_REPO });
  } catch (e) {
    return json({ error: "bad request" }, 400);
  }
}

/**
 * 处理解析短链接请求
 * @param {string} hash - 哈希值
 * @param {Object} env - 环境变量
 * @param {Request} request - 请求对象
 * @returns {Promise<Response>} 响应对象
 */
export async function handleResolve(hash, env, request) {
  // 检查CORS - 只允许本域请求
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");
  if (origin && !isSameOrigin(origin, host)) {
    return json({ error: "CORS: Origin not allowed" }, 403);
  }

  if (!hash || !HEX_RE.test(hash)) return json({ error: "invalid hash" }, 400);
  const patchUrl = `${env.GIT_REPO}/commit/${hash}.patch`;

  const res = await fetch(patchUrl, {
    cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 3600 } },
  });
  if (!res.ok) return json({ error: "not found" }, 404);

  const patch = await res.text();
  const line = extractPayloadLineFromPatch(patch);
  if (!line) return json({ error: "no payload" }, 404);

  return json({ payload: line });
}

/**
 * 通过patch重定向到目标URL或显示解密页面
 * @param {string} hash - 哈希值
 * @param {string} key - 解密密钥
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应对象
 */
export async function redirectByPatch(hash, key, env) {
  const patchUrl = `${env.GIT_REPO}/commit/${hash}.patch`;
  try {
    const res = await fetch(patchUrl, {
      cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 86400 } },
    });
    if (!res.ok) return Response.redirect(env.DEFAULT_URL);

    const patch = await res.text();
    // First try original simple mode: Subject: [PATCH] <url>
    const url = patch.match(/^Subject:\s*\[PATCH\](.*)$/m)?.[1]?.trim();
    if (url) {
      return Response.redirect(url);
    }

    // Otherwise, decrypt the content with the provided key
    const payload = extractPayloadLineFromPatch(patch);
    if (!payload) return Response.redirect(env.DEFAULT_URL);

    try {
      const encryptedData = JSON.parse(payload);
      const decryptedContent = await decryptWithPassword(key, encryptedData);

      // If decrypted content is a URL, redirect to it
      if (/^https?:\/\//i.test(decryptedContent)) {
        return Response.redirect(decryptedContent);
      }

      // Otherwise, return the decrypted content as plain text
      return new Response(decryptedContent, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      // If decryption fails, return error
      return json({ error: "not found" }, 404);
    }
  } catch (e) {
    return Response.redirect(env.DEFAULT_URL);
  }
}
