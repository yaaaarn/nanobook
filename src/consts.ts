// jwt
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production",
);
export const JWT_ALG = "HS256";
export const JWT_EXPIRY = "8h";

// pagination
export const PAGE_LIMIT = 100;

// values
export const NAME_MAX = 100;
export const MESSAGE_MAX = 5000;
export const EXTRA_FIELD_MAX = 1000;
