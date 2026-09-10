import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/loans/[loanId] — loan detail + schedule + repayments.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  const loanId = String(req.query.loanId ?? "");
  if (!loanId) throw new ApiError(400, "Missing loanId");

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId: user.id },
    include: {
      schedule: { orderBy: { installment: "asc" } },
      repayments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!loan) throw new ApiError(404, "Loan not found");

  ok(res, {
    id: loan.id,
    reference: loan.reference,
    principal: toMoney(loan.principal),
    fee: toMoney(loan.fee),
    totalRepayment: toMoney(loan.totalRepayment),
    amountPaid: toMoney(loan.amountPaid),
    remaining: Math.max(0, toMoney(loan.totalRepayment) - toMoney(loan.amountPaid)),
    monthlyRepayment: toMoney(loan.monthlyRepayment),
    periodMonths: loan.periodMonths,
    status: loan.status,
    disbursedAt: loan.disbursedAt,
    dueDate: loan.dueDate,
    schedule: loan.schedule.map((s) => ({
      id: s.id,
      installment: s.installment,
      amount: toMoney(s.amount),
      dueDate: s.dueDate,
      status: s.status,
      paidAt: s.paidAt,
    })),
    repayments: loan.repayments.map((r) => ({
      id: r.id,
      reference: r.reference,
      amount: toMoney(r.amount),
      createdAt: r.createdAt,
    })),
  });
});
