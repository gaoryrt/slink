// 加密解密功能模块
import { arrayToBase64, arrayBufferToBase64 } from "./utils.js";

/**
 * 将Base64字符串转换为Uint8Array
 * @param {string} base64 - Base64字符串
 * @returns {Uint8Array} Uint8Array
 */
function base64ToArray(base64) {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * 使用密码加密文本
 * @param {string} plainText - 要加密的明文
 * @param {string} password - 加密密码
 * @returns {Promise<Object>} 包含加密算法、盐、IV和密文的对象
 */
export async function encryptWithPassword(plainText, password) {
  const algo = "AES-GCM";
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );

  return {
    algo,
    saltBase64: arrayToBase64(salt),
    ivBase64: arrayToBase64(iv),
    cipherTextBase64: arrayBufferToBase64(cipherBuffer),
  };
}

/**
 * 使用密码解密文本
 * @param {string} password - 解密密码
 * @param {Object} encryptedData - 加密数据对象
 * @param {string} encryptedData.algo - 加密算法
 * @param {string} encryptedData.salt - Base64编码的盐
 * @param {string} encryptedData.iv - Base64编码的IV
 * @param {string} encryptedData.c - Base64编码的密文
 * @returns {Promise<string>} 解密后的明文
 */
export async function decryptWithPassword(password, encryptedData) {
  const { algo, salt, iv, c } = encryptedData;

  if (algo !== "AES-GCM") {
    throw new Error("Unsupported algorithm");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const saltBytes = base64ToArray(salt);
  const ivBytes = base64ToArray(iv);
  const cipherBytes = base64ToArray(c);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    cipherBytes
  );

  return decoder.decode(plainBuffer).trim();
}
