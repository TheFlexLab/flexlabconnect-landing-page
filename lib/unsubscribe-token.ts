import crypto from "crypto";

const TOKEN_VERSION = "v1";

type TokenPayload = {
  v: string;
  email: string;
  issuedAt: number;
};

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "UNSUBSCRIBE_SECRET must be configured and contain at least 32 characters."
    );
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createUnsubscribeToken(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Cannot create an unsubscribe token for an invalid email.");
  }

  const payload: TokenPayload = {
    v: TOKEN_VERSION,
    email: normalizedEmail,
    issuedAt: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUnsubscribeToken(token: string): TokenPayload | null {
  try {
    const [encodedPayload, providedSignature, extra] = token.split(".");
    if (!encodedPayload || !providedSignature || extra) return null;

    const expectedSignature = sign(encodedPayload);
    const expected = Buffer.from(expectedSignature, "utf8");
    const provided = Buffer.from(providedSignature, "utf8");

    if (expected.length !== provided.length) return null;
    if (!crypto.timingSafeEqual(expected, provided)) return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<TokenPayload>;

    if (
      payload.v !== TOKEN_VERSION ||
      typeof payload.email !== "string" ||
      typeof payload.issuedAt !== "number" ||
      !isValidEmail(payload.email)
    ) {
      return null;
    }

    return {
      v: TOKEN_VERSION,
      email: normalizeEmail(payload.email),
      issuedAt: payload.issuedAt,
    };
  } catch {
    return null;
  }
}
