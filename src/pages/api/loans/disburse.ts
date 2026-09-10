import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { initiateB2CPayment } from "@/lib/mpesa/service";

// POST /api/loans/disburse — pay out an approved application to the customer's
// M-Pesa via a real Daraja B2C transaction. The loan is only marked disbursed
// when the payout settles (callback or b2cquery through /api/mpesa/status).
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z.object({ applicationId: z.string().min(1) }).parse(req.body);

  const application = await prisma.loanApplication.findFirst({
    where: { id: body.applicationId, userId: user.id },
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.status === "DISBURSED") {
    return ok(res, { alreadyDisbursed: true, checkoutRequestId: null });
  }
  if (application.status !== "APPROVED") {
    throw new ApiError(
      409,
      `Application is ${application.status.toLowerCase()}; disbursement not available yet`,
    );
  }

  // Re-use an in-flight payout if one was already started for this application.
  const existing = await prisma.mpesaTransaction.findFirst({
    where: { purpose: "LOAN_DISBURSEMENT", relatedId: application.id, status: "PENDING" },
  });

  const mpesaTx =
    existing ??
    (
      await initiateB2CPayment({
        phone: application.mpesaNumber,
        amount: toMoney(application.amount),
        purpose: "LOAN_DISBURSEMENT",
        relatedType: "LoanApplication",
        relatedId: application.id,
        description: "Loan disbursement",
      })
    ).mpesaTx;

  ok(
    res,
    {
      mpesaTransactionId: mpesaTx.id,
      checkoutRequestId: mpesaTx.checkoutRequestId,
      amount: toMoney(application.amount),
      message: "Disbursement initiated. Watch for the M-Pesa message on your phone.",
    },
    202,
  );
});
