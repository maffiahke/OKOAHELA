import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { settleMpesaSuccess, settleMpesaFailure, resolveMpesaOwner } from "@/lib/mpesa/settle";

// POST /api/mpesa/demo-complete — demo-only endpoint the UI calls to simulate
// the user entering their M-Pesa PIN. Validates ownership before settling so a
// user can only complete their own pushes.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z
    .object({
      checkoutRequestId: z.string().min(1),
      outcome: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS"),
    })
    .parse(req.body);

  const tx = await prisma.mpesaTransaction.findUnique({ where: { checkoutRequestId: body.checkoutRequestId } });
  if (!tx) throw new ApiError(404, "Unknown checkout request");
  if (!tx.simulated) throw new ApiError(403, "Not a demo transaction");
  const owner = await resolveMpesaOwner(tx);
  if (owner && owner !== user.id) throw new ApiError(403, "Not your transaction");
  if (tx.status !== "PENDING") return ok(res, { alreadySettled: true, status: tx.status });

  if (body.outcome === "SUCCESS") {
    await settleMpesaSuccess(tx.id, `SIM${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);
    return ok(res, { status: "SUCCESS" });
  }
  await settleMpesaFailure(tx.id, "Request cancelled by user");
  return ok(res, { status: "FAILED" });
});
