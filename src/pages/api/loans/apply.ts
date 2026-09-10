import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { applyForLoan } from "@/lib/loans/service";
import { toMoney } from "@/lib/loans/engine";

// POST /api/loans/apply — submit a loan application.
// All financial figures are computed server-side from the LoanProduct.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z
    .object({
      productId: z.string().min(1, "Select a loan product"),
      periodMonths: z.number().int().min(1).max(24),
      mpesaNumber: z.string().min(9),
    })
    .parse(req.body);

  const application = await applyForLoan({
    userId: user.id,
    productId: body.productId,
    periodMonths: body.periodMonths,
    mpesaNumber: body.mpesaNumber,
  });

  ok(
    res,
    {
      id: application.id,
      reference: application.reference,
      amount: toMoney(application.amount),
      fee: toMoney(application.fee),
      totalRepayment: toMoney(application.totalRepayment),
      monthlyRepayment: toMoney(application.monthlyRepayment),
      periodMonths: application.periodMonths,
      status: application.status,
    },
    201,
  );
});
