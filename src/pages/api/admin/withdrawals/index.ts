import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { queryB2CResult } from "@/lib/mpesa/service";
import { settleMpesaSuccess, settleMpesaFailure } from "@/lib/mpesa/settle";

const STATUS_FILTERS: Record<string, string[]> = {
  PENDING: ["PENDING"],
  APPROVED: ["APPROVED"],
  PROCESSED: ["COMPLETED", "REJECTED", "FAILED"],
};

// Best-effort: when the Daraja callback has not arrived yet, polling the
// payout result here lets APPROVED withdrawals settle without user action.
async function refreshApproved(items: { status: string; mpesaTransactionId: string | null }[]) {
  let refreshed = false;
  for (const item of items) {
    if (item.status !== "APPROVED" || !item.mpesaTransactionId) continue;
    try {
      const mpesaTx = await prisma.mpesaTransaction.findUnique({ where: { id: item.mpesaTransactionId } });
      if (!mpesaTx || mpesaTx.status !== "PENDING") continue;
      const result = await queryB2CResult(mpesaTx);
      if (result.outcome === "SUCCESS") {
        await settleMpesaSuccess(mpesaTx.id, result.receipt ?? null);
        refreshed = true;
      } else if (result.outcome === "FAILED") {
        await settleMpesaFailure(mpesaTx.id, result.desc ?? "Payout failed");
        refreshed = true;
      }
    } catch {
      // Daraja not configured/reachable — leave the request APPROVED and retry next poll.
    }
  }
  return refreshed;
}

// GET /api/admin/withdrawals?status=PENDING|APPROVED|PROCESSED|ALL
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed");

  const status = String(req.query.status ?? "PENDING").toUpperCase();
  const where =
    status === "ALL" ? {} : { status: { in: STATUS_FILTERS[status] ?? [status] } };

  let requests = await prisma.withdrawalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { include: { profile: true } } },
  });
  if (await refreshApproved(requests)) {
    requests = await prisma.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { include: { profile: true } } },
    });
  }

  ok(res, {
    items: requests.map((r) => ({
      id: r.id,
      reference: r.reference,
      customer: r.user.profile?.fullName ?? "Customer",
      phone: r.user.phone,
      amount: toMoney(r.amount),
      mpesaNumber: r.mpesaNumber,
      status: r.status,
      note: r.note,
      mpesaTransactionId: r.mpesaTransactionId,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    })),
  });
});
