import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/admin/applications?status= — loan applications queue.
export default withApi(async (req, res) => {
  await requireAdmin(req);
  const status = String(req.query.status ?? "PENDING").toUpperCase();

  const items = await prisma.loanApplication.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { include: { profile: true } }, product: true },
  });

  ok(
    res,
    items.map((a) => ({
      id: a.id,
      reference: a.reference,
      customer: {
        id: a.user.id,
        fullName: a.user.profile?.fullName ?? "—",
        phone: a.user.phone,
      },
      product: a.product?.name ?? "—",
      amount: toMoney(a.amount),
      fee: toMoney(a.fee),
      totalRepayment: toMoney(a.totalRepayment),
      monthlyRepayment: toMoney(a.monthlyRepayment),
      periodMonths: a.periodMonths,
      mpesaNumber: a.mpesaNumber,
      status: a.status,
      createdAt: a.createdAt,
    })),
  );
});
