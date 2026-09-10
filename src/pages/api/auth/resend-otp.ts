import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOtp, generateOtp } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { phoneSchema } from "@/lib/validation/schemas";

// Resend OTP for registration. Rate limited; issues a fresh code.
export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "resend-otp", 3, 60_000);

  const body = z.object({ userId: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) throw new ApiError(404, "Account not found");
  if (user.status !== "PENDING_VERIFICATION") {
    throw new ApiError(409, "This account is already verified. Please log in.", "ALREADY_VERIFIED");
  }

  const code = generateOtp();
  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      phone: user.phone,
      codeHash: hashOtp(code),
      purpose: "REGISTRATION",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  ok(res, { resent: true, demoOtp: process.env.DEMO_MODE === "false" ? undefined : code });
});
