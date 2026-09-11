import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { passwordSchema } from "@/lib/validation/schemas";
import { hashPassword, verifyPassword } from "@/lib/auth/session";

// POST /api/profile/password — change password (verifies current one first).
export default withApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await requireUser(req);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    throw new ApiError(405, "Method not allowed");
  }

  const body = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password"),
      newPassword: passwordSchema,
    })
    .parse(req.body);

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) throw new ApiError(404, "Account not found");

  if (!(await verifyPassword(body.currentPassword, record.passwordHash))) {
    throw new ApiError(422, "Your current password is incorrect");
  }
  if (body.currentPassword === body.newPassword) {
    throw new ApiError(422, "New password must be different");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });

  ok(res, { changed: true });
});
