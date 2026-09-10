import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/admin/metrics — admin dashboard KPIs.
export default withApi(async (req, res) => {
  await requireAdmin(req);

  const [customers, pendingApps, activeLoans, disbursedAgg, repaidAgg, overdueLoans, savingsAgg, recentTxns, pendingWithdrawals] =
    await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.loanApplication.count({ where: { status: "PENDING" } }),
      prisma.loan.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.aggregate({
        where: { type: "LOAN_DISBURSEMENT", status: "SUCCESSFUL" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "LOAN_REPAYMENT", status: "SUCCESSFUL" },
        _sum: { amount: true },
      }),
      prisma.loan.count({ where: { status: "OVERDUE" } }),
      prisma.savingsAccount.aggregate({ _sum: { balance: true } }),
      prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    ]);

  ok(res, {
    customers,
    pendingApplications: pendingApps,
    pendingWithdrawals,
    activeLoans,
    overdueLoans,
    totalDisbursed: toMoney(disbursedAgg._sum.amount ?? 0),
    totalRepaid: toMoney(repaidAgg._sum.amount ?? 0),
    totalSavings: toMoney(savingsAgg._sum.balance ?? 0),
    recentTransactions: recentTxns.map((t) => ({
      id: t.id,
      reference: t.reference,
      category: t.category,
      type: t.type,
      direction: t.direction,
      amount: toMoney(t.amount),
      status: t.status,
      description: t.description,
      createdAt: t.createdAt,
    })),
  });
});
