import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { initiateB2CPayment } from "@/lib/mpesa/service";

// POST /api/savings/withdraw — real B2C payout from savings to the customer's
// M-Pesa. The balance is debited only when the payout settles successfully
// (callback or b2cquery via /api/mpesa/status).
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z
    .object({ amount: z.number().positive("Enter a valid amount").max(300000, "Maximum withdrawal is KES 300,000") })
    .parse(req.body);
  const amount = Math.round(body.amount);

  const account = await prisma.savingsAccount.findUnique({ where: { userId: user.id } });
  const balance = toMoney(account?.balance ?? 0);
  if (!account || amount > balance) {
    throw new ApiError(422, "Insufficient savings balance");
  }
  if (amount < 50) throw new ApiError(422, "Minimum withdrawal is KES 50");

  const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  const phone = profile?.mpesaNumber ?? user.phone;

  const { mpesaTx, checkoutRequestId } = await initiateB2CPayment({
    phone,
    amount,
    purpose: "SAVINGS_WITHDRAWAL",
    relatedType: "SavingsAccount",
    relatedId: user.id,
    description: "Savings withdrawal",
  });

  ok(
    res,
    {
      mpesaTransactionId: mpesaTx.id,
      checkoutRequestId,
      amount,
      message: "Your withdrawal is being processed.",
    },
    202,
  );
});
