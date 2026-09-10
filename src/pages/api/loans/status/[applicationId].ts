import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";

// GET /api/loans/status/[applicationId] — poll application review status.
// Used by the processing screen after submission.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed");

  const applicationId = String(req.query.applicationId ?? "");
  if (!applicationId) throw new ApiError(400, "Missing applicationId");

  const application = await prisma.loanApplication.findFirst({
    where: { id: applicationId, userId: user.id },
    include: { loan: { select: { id: true } } },
  });
  if (!application) throw new ApiError(404, "Application not found");

  ok(res, {
    id: application.id,
    reference: application.reference,
    status: application.status,
    loanId: application.loan?.id ?? null,
    amount: application.amount,
  });
});
