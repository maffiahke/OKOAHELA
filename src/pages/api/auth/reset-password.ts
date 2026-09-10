import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOtp, safeEqualHex, hashPassword } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { otpSchema, passwordSchema } from "@/lib/validation/schemas";

const MAX_ATTEMPTS = 5;

// POST /api/auth/reset-password — validate the reset code and set a new
// password. All existing sessions are invalidated on success.
export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "reset-password", 10, 60_000);

  const body = z
    .object({ userId: z.string().min(1), code: otpSchema, newPassword: passwordSchema })
    .parse(req.body);

  const otp = await prisma.otpVerification.findFirst({
    where: { userId: body.userId, purpose: "PASSWORD_RESET", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new ApiError(404, "No active reset request. Start over from the login screen.", "OTP_NOT_FOUND");
  if (otp.expiresAt < new Date()) {
    throw new ApiError(410, "This code has expired. Request a new one.", "OTP_EXPIRED");
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
    prisma.user.update({
      where: { id: body.userId },
      data: { passwordHash: await hashPassword(body.newPassword) },
    }),
    prisma.session.deleteMany({ where: { userId: body.userId } }),
    prisma.auditLog.create({
      data: {
        actorId: body.userId,
        actorRole: "CUSTOMER",
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: body.userId,
      },
    }),
  ]);

  ok(res, { reset: true });
});
