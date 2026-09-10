import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOtp, generateOtp } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { phoneSchema } from "@/lib/validation/schemas";

// POST /api/auth/forgot-password — issue a password-reset code for a phone.
// Same delivery model as registration OTPs: generated server-side and surfaced
// to the reset screen (no SMS gateway in this deployment).
export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "forgot-password", 3, 60_000);

  const data = z.object({ phone: phoneSchema }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (!user) throw new ApiError(404, "No account found with that phone number");

  const code = generateOtp();
  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      phone: user.phone,
      codeHash: hashOtp(code),
      purpose: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  ok(res, { userId: user.id, otp: code });
});
