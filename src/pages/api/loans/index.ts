import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/loans — current user's loans + pending applications.
export default withApi(async (req, res) => {
  const user = await requireUser(req);

  const [loans, applications] = await Promise.all([
    prisma.loan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { repayments: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.loanApplication.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  ok(res, {
    loans: loans.map((l) => ({
      id: l.id,
      reference: l.reference,
      principal: toMoney(l.principal),
      fee: toMoney(l.fee),
      totalRepayment: toMoney(l.totalRepayment),
      amountPaid: toMoney(l.amountPaid),
      monthlyRepayment: toMoney(l.monthlyRepayment),
      periodMonths: l.periodMonths,
      status: l.status,
      disbursedAt: l.disbursedAt,
      dueDate: l.dueDate,
    })),
    pendingApplications: applications.map((a) => ({
      id: a.id,
      reference: a.reference,
      amount: toMoney(a.amount),
      status: a.status,
      createdAt: a.createdAt,
    })),
  });
});
