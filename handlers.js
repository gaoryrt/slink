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
  console.log("[handleCreate] 开始处理创建请求");

  // 检查CORS - 只允许本域请求
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");
  console.log(`[handleCreate] CORS检查 - Origin: ${origin}, Host: ${host}`);

  // if (origin && !isSameOrigin(origin, host)) {
  //   console.log("[handleCreate] CORS验证失败");
  //   return json({ error: "CORS: Origin not allowed" }, 403);
  // }

  try {
    console.log("[handleCreate] 开始解析请求体");
    const body = await request.json();
    const content = String(body.content || "");
    const key = String(body.key || "");

    console.log(
      `[handleCreate] 请求参数 - content长度: ${content.length}, key长度: ${key.length}`
    );

    if (!content || !key) {
      console.log("[handleCreate] 缺少必要参数");
      return json({ error: "missing content or key" }, 400);
    }

    console.log("[handleCreate] 开始加密内容");
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
    console.log(`[handleCreate] 加密完成 - payload长度: ${payload.length}`);

    console.log("[handleCreate] 开始提交到GitHub");
    // Commit to GitHub repository (empty commit with content in subject)
    const commit = await commitEmptyToGitHub(env, payload);
    console.log(`[handleCreate] GitHub提交结果:`, commit);

    if (!commit?.sha) {
      console.log("[handleCreate] GitHub提交失败 - 没有返回SHA");
      return json({ error: "commit failed" }, 500);
    }

    const short = commit.sha.slice(0, 7);
    console.log(
      `[handleCreate] 创建成功 - short: ${short}, commitHash: ${commit.sha}`
    );
    return json({ short, commitHash: commit.sha });
  } catch (e) {
    console.error("[handleCreate] 处理过程中发生错误:", e);
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
    if (!res.ok)
      return Response.redirect(env.DEFAULT_URL || "https://coreco.re");

    const patch = await res.text();
    // First try original simple mode: Subject: [PATCH] <url>
    const url = patch.match(/^Subject:\s*\[PATCH\](.*)$/m)?.[1]?.trim();
    if (url) {
      return Response.redirect(url);
    }

    // Otherwise, decrypt the content with the provided key
    const payload = extractPayloadLineFromPatch(patch);
    if (!payload)
      return Response.redirect(env.DEFAULT_URL || "https://coreco.re");

    try {
      const encryptedData = JSON.parse(payload);
      const decryptedContent = await decryptWithPassword(key, encryptedData);

      // If decrypted content is a URL, redirect to it
      if (/^https?:\/\//i.test(decryptedContent)) {
        return Response.redirect(decryptedContent);
      }

      // Otherwise, return the decrypted content as JSON
      return json({ content: decryptedContent });
    } catch (error) {
      // If decryption fails, return error
      return json({ error: "Decryption failed" }, 400);
    }
  } catch (e) {
    return Response.redirect(env.DEFAULT_URL || "https://coreco.re");
  }
}
