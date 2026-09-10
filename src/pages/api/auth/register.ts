import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOtp, generateOtp } from "@/lib/auth/session";
import { rateLimit, withApi, ok, ApiError } from "@/lib/api";
import { phoneSchema } from "@/lib/validation/schemas";
import bcrypt from "bcryptjs";

export default withApi(async (req, res) => {
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");
  rateLimit(req, "register", 10, 60_000);

  const bodySchema = z.object({
    fullName: z.string().trim().min(3, "Enter your full name").max(80),
    phone: phoneSchema,
    nationalId: z.string().trim().regex(/^\d{6,10}$/, "National ID should be 6–10 digits"),
    dateOfBirth: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth")
      .refine((v) => {
        const age = (Date.now() - Date.parse(v)) / (365.25 * 24 * 3600 * 1000);
        return age >= 18;
      }, "You must be at least 18 years old"),
    mpesaNumber: phoneSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms & Conditions" }) }),
    acceptPrivacy: z.literal(true, { errorMap: () => ({ message: "You must accept the Privacy Policy" }) }),
  });

  const data = bodySchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) {
    throw new ApiError(409, "An account with this phone number already exists. Please log in.", "PHONE_TAKEN");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      passwordHash,
      role: "CUSTOMER",
      status: "PENDING_VERIFICATION",
      profile: {
        create: {
          fullName: data.fullName,
          nationalId: data.nationalId,
          dateOfBirth: new Date(data.dateOfBirth),
          mpesaNumber: data.mpesaNumber,
          kycStatus: "UNVERIFIED",
          loanLimit: 0,
        },
      },
    },
  });

  // Activation OTP: generated randomly server-side and surfaced to the verify
  // screen (which auto-fills it) since this deployment has no SMS gateway.
  const code = generateOtp();
  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      phone: data.phone,
      codeHash: hashOtp(code),
      purpose: "REGISTRATION",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  await prisma.auditLog.create({
    data: { actorId: user.id, actorRole: "CUSTOMER", action: "REGISTRATION_STARTED", entityType: "User", entityId: user.id },
  });

  ok(res, { userId: user.id, phone: data.phone, otp: code }, 201);
});
