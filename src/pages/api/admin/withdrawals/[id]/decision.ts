import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { initiateB2CPayment } from "@/lib/mpesa/service";

const bodySchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});

// POST /api/admin/withdrawals/[id]/decision — approve triggers the real B2C
// payout; the balance is debited only when that payout settles (settle.ts).
// Reject simply closes the request (no money has moved yet).
export default withApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const admin = await requireAdmin(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const id = String(req.query.id ?? "");
  const body = bodySchema.parse(req.body);

  const request = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!request) throw new ApiError(404, "Withdrawal request not found");
  if (request.status !== "PENDING") {
    throw new ApiError(409, `Request already ${request.status.toLowerCase()}`);
  }
  const amount = toMoney(request.amount);

  if (body.decision === "REJECT") {
    await prisma.$transaction([
      prisma.withdrawalRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", note: body.note ?? null, reviewedBy: admin.id, reviewedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: "ADMIN",
          action: "WITHDRAWAL_REJECTED",
          entityType: "WithdrawalRequest",
          entityId: request.id,
          details: JSON.stringify({ note: body.note ?? null }),
        },
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Withdrawal Declined",
          body: `Your KES ${amount.toLocaleString()} withdrawal was declined. ${body.note ?? ""}`.trim(),
          type: "SAVINGS",
        },
      }),
    ]);
    return ok(res, { id: request.id, status: "REJECTED" });
  }

  // Approve: make sure the funds (and any other in-flight approvals) are covered.
  const account = await prisma.savingsAccount.findUnique({ where: { userId: request.userId } });
  const balance = toMoney(account?.balance ?? 0);
  const committed = await prisma.withdrawalRequest.aggregate({
    where: { userId: request.userId, status: "APPROVED" },
    _sum: { amount: true },
  });
  const committedAmount = toMoney(committed._sum.amount ?? 0);
  if (amount > balance - committedAmount) {
    throw new ApiError(422, "Customer savings balance cannot cover this payout (other withdrawals in flight).");
  }

  const { mpesaTx } = await initiateB2CPayment({
    phone: request.mpesaNumber,
    amount,
    purpose: "SAVINGS_WITHDRAWAL",
    relatedType: "WithdrawalRequest",
    relatedId: request.id,
    description: `Savings withdrawal ${request.reference}`,
  });

  await prisma.$transaction([
    prisma.withdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        note: body.note ?? null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        mpesaTransactionId: mpesaTx.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: "ADMIN",
        action: "WITHDRAWAL_APPROVED",
        entityType: "WithdrawalRequest",
        entityId: request.id,
        details: JSON.stringify({ mpesaTransactionId: mpesaTx.id, note: body.note ?? null }),
      },
    }),
    prisma.notification.create({
      data: {
        userId: request.userId,
        title: "Withdrawal Approved ✅",
        body: `Your KES ${amount.toLocaleString()} withdrawal is being sent to ${request.mpesaNumber}.`,
        type: "SAVINGS",
      },
    }),
  ]);

  ok(res, { id: request.id, status: "APPROVED", mpesaTransactionId: mpesaTx.id });
});
