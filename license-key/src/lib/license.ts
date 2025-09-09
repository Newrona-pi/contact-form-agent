import crypto from "crypto";
import { hash, verify } from "@node-rs/argon2";

function group4(s: string) {
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}

export function generateKeyId() {
  // 12 hex (48bit) を大文字化
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export function generateSecret() {
  // base64url 22~23桁程度
  const raw = crypto.randomBytes(16).toString("base64url");
  return raw.toUpperCase();
}

export function formatLicense(keyId: string, secret: string) {
  return `RP1-${group4(keyId)}.${group4(secret)}`;
}

export function parseLicense(full: string) {
  const [left, right] = full.split(".");
  if (!left || !right) throw new Error("INVALID_FORMAT");
  const keyId = left.replace(/^RP1-/, "").replace(/-/g, "");
  const secret = right.replace(/-/g, "");
  return { keyId, secret };
}

export async function hashSecret(secret: string) {
  return hash(secret);
}

export async function verifySecret(hashString: string, secret: string) {
  return verify(hashString, secret);
}
