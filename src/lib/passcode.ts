import crypto from "crypto";

/**
 * Passcode hashing uses scrypt (built into Node, no extra dependency).
 * Stored format: "saltHex:hashHex".
 *
 * This file uses Node's `crypto` module, so it must only ever be imported
 * from API routes (Node runtime) — never from middleware.ts, which runs in
 * the Edge Runtime and doesn't support it. See session.ts for the
 * Edge-safe session-cookie logic middleware actually uses.
 */

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(passcode, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = crypto.scryptSync(passcode, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (derivedKey.length !== expected.length) return false;
  return crypto.timingSafeEqual(derivedKey, expected);
}
