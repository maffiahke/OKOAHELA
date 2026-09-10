import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok } from "@/lib/api";
import { settleMpesaSuccess, settleMpesaFailure } from "@/lib/mpesa/settle";

// POST /api/mpesa/callback - settlement endpoint for Safaricom Daraja.
// Handles both real callback shapes:
//   1. STK push:  { Body: { stkCallback: { CheckoutRequestID, ResultCode,
//      CallbackMetadata: { Item: [...] } } } }
//   2. B2C result: { Result: { ConversationID, OriginatorConversationID,
//      ResultCode, ResultDesc, ReceiptID } }
// Financial effects are applied ONLY here (and by the idempotent query-based
// settlement in /api/mpesa/status) via the settle module.
export default withApi(async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  let lookupId: string | null = null;
  let success = false;
  let receipt: string | null = null;
  let reason: string | null = null;

  const stk = (body as { Body?: { stkCallback?: Record<string, unknown> } }).Body?.stkCallback;
  const result = (body as { Result?: Record<string, unknown> }).Result;

  if (stk) {
    lookupId = String(stk.CheckoutRequestID ?? "");
    const resultCode = Number(stk.ResultCode ?? 1);
    success = resultCode === 0;
    const resultDesc = String(stk.ResultDesc ?? "");
    reason = success ? resultDesc : `ResultCode ${resultCode}: ${resultDesc}`;
    if (success) {
      const meta = stk.CallbackMetadata as { Item?: { Name: string; Value: unknown }[] } | undefined;
      receipt = meta?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value?.toString() ?? null;
    }
  } else if (result) {
    // B2C: ConversationID matches the checkoutRequestId we stored; fall back to
    // OriginatorConversationID (our internal reference) if it doesn't.
    lookupId = String(result.ConversationID ?? result.OriginatorConversationID ?? "");
    const resultCode = Number(result.ResultCode ?? 1);
    success = resultCode === 0;
    const resultDesc = String(result.ResultDesc ?? "");
    reason = success ? resultDesc : `ResultCode ${resultCode}: ${resultDesc}`;
    if (success) receipt = String(result.ReceiptID ?? "") || null;
  }

  if (!lookupId) return ok(res, { ResultCode: 0, ResultDesc: "Ignored" });

  const tx =
    (await prisma.mpesaTransaction.findFirst({ where: { checkoutRequestId: lookupId } })) ??
    (await prisma.mpesaTransaction.findFirst({ where: { reference: lookupId } }));
  if (!tx) return ok(res, { ResultCode: 0, ResultDesc: "Unknown checkout request" });
  if (tx.status !== "PENDING") return ok(res, { ResultCode: 0, ResultDesc: "Already processed" });

  if (success) {
    await settleMpesaSuccess(tx.id, receipt);
    return ok(res, { ResultCode: 0, ResultDesc: "Accepted" });
  }
  await settleMpesaFailure(tx.id, reason ?? "Transaction failed");
  return ok(res, { ResultCode: 0, ResultDesc: "Accepted" });
});
