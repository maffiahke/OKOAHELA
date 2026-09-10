import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { isDemoMode } from "@/lib/mpesa/service";

// POST /api/loans/disburse — confirm disbursement of an approved application.
// In demo mode this creates a simulated M-Pesa disbursement the UI settles via
// the STK modal (demo-complete). In live mode a real B2C payout would fire here.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z.object({ applicationId: z.string().min(1) }).parse(req.body);

  const application = await prisma.loanApplication.findFirst({
    where: { id: body.applicationId, userId: user.id },
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status === "DISBURSED") return ok(res, { alreadyDisbursed: true });
  if (application.status !== "APPROVED") {
    throw new ApiError(409, `Application is ${application.status.toLowerCase()}; disbursement not available yet`);
  }

  const checkoutRequestId = `ws_CO_B2C_${Date.now().toString(36).toUpperCase()}`;
  const mpesaTx = await prisma.mpesaTransaction.create({
    data: {
      reference: `MPX-B2C-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`,
      mode: isDemoMode ? "DEMO" : "LIVE",
      type: "B2C_DISBURSEMENT",
      purpose: "LOAN_DISBURSEMENT",
      phone: application.mpesaNumber,
      amount: application.amount,
      status: "PENDING",
      relatedType: "LoanApplication",
      relatedId: application.id,
      checkoutRequestId,
      simulated: isDemoMode,
    },
  });

  ok(
    res,
    {
      mpesaTransactionId: mpesaTx.id,
      checkoutRequestId,
      amount: toMoney(application.amount),
      demo: isDemoMode,
      message: "Disbursement initiated. Confirm on your phone.",
    },
    202,
  );
});
