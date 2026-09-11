import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOtp, safeEqualHex, generateOtp, createSession, sessionCookieHeader } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { otpSchema } from "@/lib/validation/schemas";
import { DEFAULT_LOAN_LIMIT } from "@/lib/loans/engine";

const MAX_ATTEMPTS = 5;

export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "verify-otp", 15, 60_000);

  const body = z
    .object({ userId: z.string().min(1), code: otpSchema })
    .parse(req.body);

  const otp = await prisma.otpVerification.findFirst({
    where: { userId: body.userId, purpose: "REGISTRATION", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new ApiError(404, "No pending verification found. Please register again.", "OTP_NOT_FOUND");
  if (otp.expiresAt < new Date()) {
    throw new ApiError(410, "This code has expired. Please request a new one.", "OTP_EXPIRED");
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect attempts. Request a new code.", "OTP_LOCKED");
  }

  if (!safeEqualHex(hashOtp(body.code), otp.codeHash)) {
    await prisma.otpVerification.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(401, "Incorrect code. Please try again.", "OTP_INVALID");
  }

  await prisma.$transaction([
    prisma.otpVerification.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: body.userId }, data: { status: "ACTIVE" } }),
    prisma.customerProfile.updateMany({
      where: { userId: body.userId },
      data: { kycStatus: "VERIFIED", loanLimit: DEFAULT_LOAN_LIMIT },
    }),
    prisma.notification.create({
      data: {
        userId: body.userId,
        title: "Welcome to OKOAHELA 🎉",
        body: "Your account is verified. You can now apply for loans and start saving.",
        type: "GENERAL",
      },
    }),
    prisma.auditLog.create({
      data: { actorId: body.userId, actorRole: "CUSTOMER", action: "PHONE_VERIFIED", entityType: "User", entityId: body.userId },
    }),
  ]);

  // Savings account is created lazily (first deposit / dashboard load) via
  // upsert in the savings service — no createMany-with-where in Prisma.
  await prisma.savingsAccount.upsert({ where: { userId: body.userId }, update: {}, create: { userId: body.userId } });

  const { token } = await createSession(body.userId, "registration");
  res.setHeader("Set-Cookie", sessionCookieHeader(token, process.env.NODE_ENV === "production"));
  ok(res, { verified: true });
});
