import { SignJWT, jwtVerify } from "jose";
import { JWT_ALG, JWT_EXPIRY, JWT_SECRET } from "../consts";
import type { Cookie } from "elysia";

export async function signToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (stored.startsWith("$argon2id")) {
    return await Bun.password.verify(plain, stored);
  }

  console.warn(
    "WARNING: admin password is stored in plaintext. Hash it with bcrypt.",
  );
  return plain === stored;
}

export async function isAuthenticated(
  cookie: Record<string, Cookie<unknown>>,
): Promise<boolean> {
  const token = cookie.auth?.value;
  if (typeof token !== "string" || !token) return false;
  return verifyToken(token);
}
