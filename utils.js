// 工具函数模块

// 正则表达式：匹配7-40位的十六进制字符串
export const HEX_RE = /^[0-9a-f]{7,40}$/;

/**
 * CORS检查辅助函数 - 检查是否为同源请求
 * @param {string} origin - 请求来源
 * @param {string} host - 请求主机
 * @returns {boolean} 是否为同源请求
 */
export function isSameOrigin(origin, host) {
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const hostUrl = new URL(`https://${host}`);

    // 比较协议、主机名和端口
    return (
      originUrl.protocol === hostUrl.protocol &&
      originUrl.hostname === hostUrl.hostname &&
      originUrl.port === hostUrl.port
    );
  } catch (e) {
    return false;
  }
}

/**
 * 创建JSON响应
 * @param {any} obj - 响应对象
 * @param {number} status - HTTP状态码
 * @returns {Response} JSON响应
 */
export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * 将ArrayBuffer转换为Base64字符串
 * @param {ArrayBuffer} buffer - 要转换的ArrayBuffer
 * @returns {string} Base64字符串
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * 将Uint8Array转换为Base64字符串
 * @param {Uint8Array} arr - 要转换的Uint8Array
 * @returns {string} Base64字符串
 */
export function arrayToBase64(arr) {
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

/**
 * 从patch文本中提取payload行
 * @param {string} patchText - patch文本内容
 * @returns {string|null} 提取的payload或null
 */
export function extractPayloadLineFromPatch(patchText) {
  // Look for slink payload in Subject: [PATCH] slink:<json>
  const subjectJson = patchText.match(
    /^Subject:\s*\[PATCH\]\s*slink:(\{.*\})$/m
  )?.[1];
  if (subjectJson) return subjectJson;

  // Fallback: look for added lines (for backward compatibility)
  const addedLines = patchText.match(/^\+\{.*\}$/gm);
  if (addedLines && addedLines.length > 0) {
    // choose the first added json line
    return addedLines[0].slice(1);
  }
  return null;
}
