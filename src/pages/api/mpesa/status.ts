import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getMpesaTxByCheckoutId, queryStkPushResult, queryB2CResult } from "@/lib/mpesa/service";
import { settleMpesaSuccess, settleMpesaFailure } from "@/lib/mpesa/settle";

// GET /api/mpesa/status?checkoutRequestId=... — poll STK push / B2C status.
// While a transaction is still PENDING we ask Daraja directly (stkpushquery /
// b2cquery), so payments settle even when the Safaricom callback cannot reach
// this server. Settlement (and its financial effects) goes through the same
// idempotent settle functions the callback uses.
export default withApi(async (req, res) => {
  await requireUser(req);
  const checkoutRequestId = String(req.query.checkoutRequestId ?? "");
  if (!checkoutRequestId) throw new ApiError(400, "Missing checkoutRequestId");

  let tx = await getMpesaTxByCheckoutId(checkoutRequestId);
  if (!tx) throw new ApiError(404, "Transaction not found");

  if (tx.status === "PENDING") {
    try {
      const q = tx.type.startsWith("B2C")
        ? await queryB2CResult(tx)
        : await queryStkPushResult(tx);
      if (q.outcome === "SUCCESS") {
        tx = (await settleMpesaSuccess(tx.id, q.receipt ?? tx.mpesaReceipt)) ?? tx;
      } else if (q.outcome === "FAILED") {
        tx = (await settleMpesaFailure(tx.id, q.desc ?? "Transaction failed")) ?? tx;
      } else if (q.desc && q.desc !== tx.resultDesc) {
        tx = await prisma.mpesaTransaction.update({
          where: { id: tx.id },
          data: { resultDesc: q.desc },
        });
      }
    } catch {
      /* Daraja unreachable — report the currently stored status */
    }
  }

  ok(res, {
    id: tx.id,
    status: tx.status,
    resultDesc: tx.resultDesc,
    receipt: tx.mpesaReceipt,
  });
});
