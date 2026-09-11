import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { initiateStkPush } from "@/lib/mpesa/service";
import { getSettings } from "@/lib/settings";

// POST /api/savings/deposit — STK push deposit into savings.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const settings = await getSettings();
  const body = z
    .object({ amount: z.number().positive("Enter a valid amount").max(settings.maxSavingsDeposit, `Maximum deposit is KES ${settings.maxSavingsDeposit.toLocaleString()}`) })
    .parse(req.body);
  const amount = Math.round(body.amount);
  if (amount < settings.minSavingsDeposit) throw new ApiError(422, `Minimum deposit is KES ${settings.minSavingsDeposit.toLocaleString()}`);

  const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  const phone = profile?.mpesaNumber ?? user.phone;

  const { mpesaTx, checkoutRequestId } = await initiateStkPush({
    phone,
    amount,
    purpose: "SAVINGS_DEPOSIT",
    relatedType: "SavingsAccount",
    relatedId: user.id,
    description: "Savings deposit",
  });

  ok(
    res,
    {
      mpesaTransactionId: mpesaTx.id,
      checkoutRequestId,
      amount,
      message: "Check your phone and enter your M-Pesa PIN.",
    },
    202,
  );
});
