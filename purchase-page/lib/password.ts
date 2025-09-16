import crypto from "crypto";

interface HashPasswordOptions {
  salt?: string;
  iterations?: number;
  keyLength?: number;
  digest?: string;
}

const DEFAULT_ITERATIONS = 120000;
const DEFAULT_KEY_LENGTH = 64;
const DEFAULT_DIGEST = "sha512";

export function hashPassword(
  password: string,
  {
    salt,
    iterations = DEFAULT_ITERATIONS,
    keyLength = DEFAULT_KEY_LENGTH,
    digest = DEFAULT_DIGEST,
  }: HashPasswordOptions = {}
) {
  const resolvedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(password, resolvedSalt, iterations, keyLength, digest)
    .toString("hex");

  return {
    hash: derivedKey,
    salt: resolvedSalt,
    iterations,
    keyLength,
    digest,
  };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  {
    iterations = DEFAULT_ITERATIONS,
    keyLength = DEFAULT_KEY_LENGTH,
    digest = DEFAULT_DIGEST,
  }: Partial<HashPasswordOptions> = {}
) {
  const { hash: calculated } = hashPassword(password, {
    salt,
    iterations,
    keyLength,
    digest,
  });

  return crypto.timingSafeEqual(
    Buffer.from(calculated, "hex"),
    Buffer.from(hash, "hex")
  );
}
