import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { initiateStkPush } from "@/lib/mpesa/service";

// POST /api/loans/repay — trigger M-Pesa STK push for a loan repayment.
// The loan balance is only updated after the M-Pesa callback confirms success.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z
    .object({
      loanId: z.string().min(1),
      amount: z.number().positive("Enter a valid amount"),
    })
    .parse(req.body);

  const loan = await prisma.loan.findFirst({
    where: { id: body.loanId, userId: user.id },
  });
  if (!loan) throw new ApiError(404, "Loan not found");
  if (loan.status === "FULLY_REPAID") throw new ApiError(409, "This loan is already fully repaid.");

  const remaining = toMoney(loan.totalRepayment) - toMoney(loan.amountPaid);
  if (body.amount > remaining + 0.001) {
    throw new ApiError(422, `Amount exceeds remaining balance of KES ${remaining.toLocaleString()}`);
  }

  const { mpesaTx, checkoutRequestId } = await initiateStkPush({
    phone: loan.mpesaNumber,
    amount: body.amount,
    purpose: "LOAN_REPAYMENT",
    relatedType: "Loan",
    relatedId: loan.id,
    description: "Loan repayment",
  });

  ok(
    res,
    {
      mpesaTransactionId: mpesaTx.id,
      checkoutRequestId,
      amount: body.amount,
      message: "Check your phone and enter your M-Pesa PIN.",
    },
    202,
  );
});
