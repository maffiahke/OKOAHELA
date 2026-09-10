import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, sessionCookieHeader } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { phoneSchema } from "@/lib/validation/schemas";

export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "login", 8, 60_000);

  const body = z
    .object({
      phone: phoneSchema,
      password: z.string().min(1, "Enter your password"),
    })
    .parse(req.body);

  const user = await prisma.user.findUnique({
    where: { phone: body.phone },
    include: { profile: true },
  });

  // Uniform error to avoid revealing which accounts exist.
  const invalid = new ApiError(401, "Incorrect phone number or password", "INVALID_CREDENTIALS");
  if (!user) throw invalid;
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) throw invalid;
  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "Your account has been suspended. Contact support for help.", "ACCOUNT_SUSPENDED");
  }
  if (user.status === "PENDING_VERIFICATION") {
    // Send the client to the verification screen with what it needs.
    throw new ApiError(403, "Please verify your phone number before logging in.", "NOT_VERIFIED", {
      userId: user.id,
    });
  }

  const { token, expiresAt } = await createSession(user.id, req.headers["user-agent"]);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({
    data: { actorId: user.id, actorRole: user.role, action: "LOGIN", entityType: "User", entityId: user.id },
  });

  res.setHeader("Set-Cookie", sessionCookieHeader(token, expiresAt, process.env.NODE_ENV === "production"));
  ok(res, {
    id: user.id,
    phone: user.phone,
    role: user.role,
    fullName: user.profile?.fullName ?? null,
  });
});
