import { randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "okohela_session";
// Session cookie expires when the browser closes; the server enforces a
// sliding idle window and a hard max lifetime per login.
const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60_000;
const SESSION_MAX_MS = Number(process.env.SESSION_MAX_HOURS ?? 12) * 3_600_000;

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  status: string;
  fullName: string | null;
  nationalId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// 6-digit cryptographically random code; leading zeros allowed.
export function generateOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export function readSessionToken(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.trim().slice(SESSION_COOKIE.length + 1)) : null;
}

export async function createSession(userId: string, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  // Opportunistically prune sessions that are past their absolute lifetime.
  await prisma.session
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - SESSION_MAX_MS) } } })
    .catch(() => undefined);
  await prisma.session.create({ data: { token, userId, expiresAt, userAgent: userAgent ?? null } });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

// No Expires attribute → a browser-session cookie, cleared when the tab closes.
export function sessionCookieHeader(token: string, secure: boolean): string {
  const flags = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export function clearSessionCookieHeader(secure: boolean): string {
  const flags = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export async function getSessionUserFromCookie(cookieHeader: string | null | undefined): Promise<AuthUser | null> {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { profile: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    // Idle (or absolute) timeout hit — kill the session server-side.
    await prisma.session.deleteMany({ where: { token } }).catch(() => undefined);
    return null;
  }
  // Sliding window: extend on activity, capped at the max lifetime.
  const hardCap = session.createdAt.getTime() + SESSION_MAX_MS;
  const nextExpiry = Math.min(now + SESSION_IDLE_MS, hardCap);
  if (nextExpiry > session.expiresAt.getTime() + 60_000) {
    await prisma.session
      .update({ where: { token }, data: { expiresAt: new Date(nextExpiry) } })
      .catch(() => undefined);
  }
  return {
    id: session.user.id,
    phone: session.user.phone,
    role: session.user.role,
    status: session.user.status,
    fullName: session.user.profile?.fullName ?? null,
    nationalId: session.user.profile?.nationalId ?? null,
  };
}

export { SESSION_COOKIE };
