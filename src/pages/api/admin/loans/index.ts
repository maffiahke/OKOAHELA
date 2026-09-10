import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/admin/loans — all loans with customer info.
export default withApi(async (req, res) => {
  await requireAdmin(req);
  const status = String(req.query.status ?? "ALL").toUpperCase();

  const loans = await prisma.loan.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { include: { profile: true } } },
  });

  ok(
    res,
    loans.map((l) => ({
      id: l.id,
      reference: l.reference,
      customer: {
        id: l.user.id,
        fullName: l.user.profile?.fullName ?? "—",
        phone: l.user.phone,
      },
      principal: toMoney(l.principal),
      fee: toMoney(l.fee),
      totalRepayment: toMoney(l.totalRepayment),
      amountPaid: toMoney(l.amountPaid),
      remaining: Math.max(0, toMoney(l.totalRepayment) - toMoney(l.amountPaid)),
      periodMonths: l.periodMonths,
      status: l.status,
      disbursedAt: l.disbursedAt,
      dueDate: l.dueDate,
    })),
  );
});
