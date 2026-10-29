import { createHmac, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
export const COOKIE = "petty_session";
export const TTL = 12 * 60 * 60;
// Best-effort per-instance rate limit only; session validity never uses memory.
const state = globalThis as typeof globalThis & {
  pettyAuth?: { attempts: { count: number; until: number } };
};
const store = state.pettyAuth ??= { attempts: { count: 0, until: 0 } };

export function configuration() {
  const secret = process.env.AUTH_SECRET;
  const hash = process.env.AUTH_PASSWORD_HASH;
  const username = process.env.AUTH_USERNAME;
  if (!secret || secret.length < 64 || !hash || !username ||
      !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash) ||
      (process.env.NODE_ENV === "production" && process.env.AUTH_LOCAL_TEST_ONLY !== "false")) {
    throw new Error("Authentication is not configured for this environment. See AUTH.md.");
  }
  return { secret, hash, username };
}

export async function verifyCredentials(username: string, password: string) {
  const config = configuration();
  const [, salt, expected] = config.hash.split("$");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
  const valid = timingSafeEqual(derived, Buffer.from(expected, "hex"));
  // The local test password must never work in a production process.
  return valid && username === config.username &&
    !(process.env.NODE_ENV === "production" && (password.length < 12 || password === "Petty" + "Court"));
}

function sign(payload: string) {
  return createHmac("sha256", configuration().secret).update(payload).digest("hex");
}
export function createSession() {
  const payload = Buffer.from(JSON.stringify({
    username: configuration().username,
    expiry: Math.floor(Date.now() / 1000) + TTL,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function validSession(token?: string) {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) return false;
  try {
    const [payload, signature] = token.split(".");
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(payload), "hex"))) return false;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    return session?.username === configuration().username && Number.isSafeInteger(session?.expiry) &&
      session.expiry > now && session.expiry <= now + TTL;
  } catch { return false; }
}
// Account-wide bucket: cannot be bypassed with spoofed forwarding headers.
// Called only after credential verification fails; valid logins always bypass it.
export function loginLimit() {
  const now = Date.now();
  if (store.attempts.until <= now) store.attempts = { count: 0, until: now + 15 * 60 * 1000 };
  if (store.attempts.count >= 5) return Math.ceil((store.attempts.until - now) / 1000);
  store.attempts.count++;
  return 0;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const,
  path: "/", maxAge: TTL,
};

