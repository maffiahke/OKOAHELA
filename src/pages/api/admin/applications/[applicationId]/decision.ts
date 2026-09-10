import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";

// POST /api/admin/applications/[applicationId]/decision — approve or reject.
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const applicationId = String(req.query.applicationId ?? "");
  const body = z
    .object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().max(500).optional() })
    .parse(req.body);

  const application = await prisma.loanApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status !== "PENDING") {
    throw new ApiError(409, `Application already ${application.status.toLowerCase()}`);
  }

  const status = body.decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const [updated] = await prisma.$transaction([
    prisma.loanApplication.update({
      where: { id: application.id },
      data: { status, reviewedBy: admin.id, reviewedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: "ADMIN",
        action: `LOAN_APPLICATION_${body.decision}D`,
        entityType: "LoanApplication",
        entityId: application.id,
        details: JSON.stringify({ note: body.note ?? null }),
      },
    }),
    prisma.notification.create({
      data: {
        userId: application.userId,
        title: body.decision === "APPROVE" ? "Loan Approved ✅" : "Loan Application Declined",
        body:
          body.decision === "APPROVE"
            ? "Your loan has been approved. Confirm disbursement to receive funds on M-Pesa."
            : `Unfortunately your loan application was declined. ${body.note ?? ""}`.trim(),
        type: "LOAN",
      },
    }),
  ]);

  ok(res, { id: updated.id, status: updated.status });
});
