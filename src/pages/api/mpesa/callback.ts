import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok } from "@/lib/api";
import { settleMpesaSuccess, settleMpesaFailure } from "@/lib/mpesa/settle";

// POST /api/mpesa/callback - settlement endpoint for Safaricom Daraja STK
// callbacks. Handles BOTH shapes:
//   1. Real Daraja: { Body: { stkCallback: { CheckoutRequestID, ResultCode,
//      CallbackMetadata: { Item: [{ Name, Value }] } } } }
//   2. Demo/internal: { checkoutRequestId, outcome: "SUCCESS"|"FAILED" }
// Financial effects are applied ONLY here via settleMpesaSuccess (idempotent).
export default withApi(async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  let checkoutRequestId: string | null = null;
  let success = false;
  let receipt: string | null = null;
  let reason: string | null = null;

  const stk = (body as { Body?: { stkCallback?: Record<string, unknown> } }).Body?.stkCallback;
  if (stk) {
    checkoutRequestId = String(stk.CheckoutRequestID ?? "");
    const resultCode = Number(stk.ResultCode ?? 1);
    success = resultCode === 0;
    const resultDesc = String(stk.ResultDesc ?? "");
    reason = success ? resultDesc : "ResultCode " + resultCode + ": " + resultDesc;
    if (success) {
      const meta = stk.CallbackMetadata as { Item?: { Name: string; Value: unknown }[] } | undefined;
      receipt = meta?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value?.toString() ?? null;
    }
  } else if (typeof body.checkoutRequestId === "string") {
    checkoutRequestId = body.checkoutRequestId;
    success = body.outcome === "SUCCESS";
    receipt = typeof body.receipt === "string" ? body.receipt : null;
    reason = typeof body.reason === "string" ? body.reason : "Request cancelled by user";
  }

  if (!checkoutRequestId) return ok(res, { ResultCode: 0, ResultDesc: "Ignored" });

  const tx = await prisma.mpesaTransaction.findFirst({ where: { checkoutRequestId } });
  if (!tx) return ok(res, { ResultCode: 0, ResultDesc: "Unknown checkout request" });
  if (tx.status !== "PENDING") return ok(res, { ResultCode: 0, ResultDesc: "Already processed" });

  if (success) {
    await settleMpesaSuccess(tx.id, receipt ?? ("SIM" + Date.now()));
    return ok(res, { ResultCode: 0, ResultDesc: "Accepted" });
  }
  await settleMpesaFailure(tx.id, reason ?? "Request cancelled by user");
  return ok(res, { ResultCode: 0, ResultDesc: "Accepted" });
});