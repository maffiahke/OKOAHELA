import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { getMpesaTxByCheckoutId } from "@/lib/mpesa/service";

// GET /api/mpesa/status?checkoutRequestId=... — poll STK push status.
// The frontend polls this while the animated waiting indicator shows.
// Financial effects are NEVER applied here; only the callback endpoint does that.
export default withApi(async (req, res) => {
  await requireUser(req);
  const checkoutRequestId = String(req.query.checkoutRequestId ?? "");
  if (!checkoutRequestId) throw new ApiError(400, "Missing checkoutRequestId");

  const tx = await getMpesaTxByCheckoutId(checkoutRequestId);
  if (!tx) throw new ApiError(404, "Transaction not found");

  ok(res, {
    id: tx.id,
    status: tx.status,
    resultDesc: tx.resultDesc,
    receipt: tx.mpesaReceipt,
    simulated: tx.simulated,
  });
});
