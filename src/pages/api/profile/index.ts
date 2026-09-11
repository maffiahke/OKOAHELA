import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { phoneSchema, nationalIdSchema, nameSchema, dobSchema } from "@/lib/validation/schemas";

// GET   /api/profile — full profile for the account screens
// PATCH /api/profile — update personal info / M-Pesa number
export default withApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ApiError(404, "Profile not found");
    return ok(res, {
      fullName: profile.fullName,
      nationalId: profile.nationalId,
      dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
      mpesaNumber: profile.mpesaNumber,
      kycStatus: profile.kycStatus,
      loanLimit: Number(profile.loanLimit),
      phone: user.phone,
      role: user.role,
      memberSince: profile.createdAt.toISOString(),
    });
  }

  if (req.method === "PATCH") {
    const body = z
      .object({
        fullName: nameSchema.optional(),
        nationalId: nationalIdSchema.optional(),
        dateOfBirth: dobSchema.optional(),
        mpesaNumber: phoneSchema.optional(),
      })
      .parse(req.body);

    if (
      body.fullName === undefined &&
      body.nationalId === undefined &&
      body.dateOfBirth === undefined &&
      body.mpesaNumber === undefined
    ) {
      throw new ApiError(422, "Nothing to update");
    }

    const existing = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
    if (!existing) throw new ApiError(404, "Profile not found");

    const updated = await prisma.customerProfile.update({
      where: { userId: user.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.nationalId !== undefined ? { nationalId: body.nationalId } : {}),
        ...(body.dateOfBirth !== undefined ? { dateOfBirth: new Date(body.dateOfBirth) } : {}),
        ...(body.mpesaNumber !== undefined ? { mpesaNumber: body.mpesaNumber } : {}),
      },
    });

    return ok(res, {
      fullName: updated.fullName,
      nationalId: updated.nationalId,
      dateOfBirth: updated.dateOfBirth.toISOString().slice(0, 10),
      mpesaNumber: updated.mpesaNumber,
    });
  }

  res.setHeader("Allow", "GET, PATCH");
  throw new ApiError(405, "Method not allowed");
});
