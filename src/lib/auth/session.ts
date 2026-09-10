import { randomBytes, createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "okohela_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  status: string;
  fullName: string | null;
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
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt, userAgent: userAgent ?? null } });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export function sessionCookieHeader(token: string, expiresAt: Date, secure: boolean): string {
  const flags = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
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
  if (!session || session.expiresAt < new Date()) return null;
  return {
    id: session.user.id,
    phone: session.user.phone,
    role: session.user.role,
    status: session.user.status,
    fullName: session.user.profile?.fullName ?? null,
  };
}

export { SESSION_COOKIE };
