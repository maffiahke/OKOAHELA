import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function ok<T>(res: NextApiResponse, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(
  res: NextApiResponse,
  status: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
) {
  return res.status(status).json({ ok: false, error: { message, code, details } });
}

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

// Wrap handlers: central error mapping, JSON body parsing, no-store caching.
export function withApi(handler: Handler): Handler {
  return async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      if (req.method !== "GET" && req.body === "") req.body = {};
      await handler(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        fail(res, err.status, err.message, err.code, err.details);
        return;
      }
      if (err instanceof z.ZodError) {
        const msg = err.issues[0]?.message ?? "Invalid input";
        fail(res, 422, msg, "VALIDATION");
        return;
      }
      console.error("[api]", err);
      fail(res, 500, "Something went wrong. Please try again.", "INTERNAL");
    }
  };
}

// Simple in-memory rate limiter keyed by ip+bucket. Fine for a single
// instance; swap for a shared store (e.g. Redis) behind a load balancer.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: NextApiRequest, bucket: string, limit: number, windowMs: number) {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new ApiError(429, "Too many attempts. Please wait a moment and try again.", "RATE_LIMITED");
  }
}

export function getPagination(req: NextApiRequest) {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export { requireUser, requireAdmin } from "@/lib/auth/guards";
