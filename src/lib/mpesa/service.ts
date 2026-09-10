import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

// ── M-Pesa service ──────────────────────────────────────────────────────────
// DEMO MODE: when DEMO_MODE=true (or Daraja credentials are absent), STK push
// and B2C disbursements are simulated server-side. Simulated transactions are
// always flagged mode="DEMO" + simulated=true so they can never be confused
// with production financial records.
//
// LIVE MODE: real Daraja OAuth + STK Push (CustomerBuyGoodsOnline style for
// till / Paybill STK). Callback handling is identical for both modes: the
// /api/mpesa/callback endpoint validates, de-duplicates (idempotency via
// checkoutRequestId), then applies the financial effect in a DB transaction.

const DEMO_MODE =
  process.env.DEMO_MODE === "true" ||
  !process.env.MPESA_CONSUMER_KEY ||
  !process.env.MPESA_CONSUMER_SECRET;

export const isDemoMode = DEMO_MODE;

export type MpesaPurpose =
  | "LOAN_DISBURSEMENT"
  | "LOAN_REPAYMENT"
  | "SAVINGS_DEPOSIT"
  | "SAVINGS_WITHDRAWAL";

interface StkRequest {
  phone: string;
  amount: number;
  purpose: MpesaPurpose;
  relatedType: string;
  relatedId: string;
  description: string;
}

async function darajaToken(): Promise<string | null> {
  if (DEMO_MODE) return null;
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
    ).toString("base64");
    const res = await fetch(
      `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
      { method: "GET", headers: { Authorization: `Basic ${auth}` } },
    );
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function initiateStkPush(req: StkRequest) {
  const reference = `MPX-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  const shortCode = process.env.MPESA_SHORTCODE || "174379";
  const passkey = process.env.MPESA_PASSKEY || "";
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.]/g, "")
    .slice(0, 14);
  const checkoutRequestId = `ws_CO_${Date.now()}DEMO`;

  const mpesaTx = await prisma.mpesaTransaction.create({
    data: {
      reference,
      mode: DEMO_MODE ? "DEMO" : "LIVE",
      type: "STK_PUSH",
      purpose: req.purpose,
      phone: req.phone,
      amount: new Prisma.Decimal(req.amount),
      status: "PENDING",
      relatedType: req.relatedType,
      relatedId: req.relatedId,
      checkoutRequestId: DEMO_MODE ? checkoutRequestId : null,
      simulated: DEMO_MODE,
    },
  });

  if (DEMO_MODE) {
    return { mpesaTx, demo: true as const, checkoutRequestId };
  }

  // Live Daraja STK push
  const token = await darajaToken();
  if (!token) {
    await prisma.mpesaTransaction.update({
      where: { id: mpesaTx.id },
      data: { status: "FAILED", resultDesc: "Could not authenticate with Daraja" },
    });
    throw new Error("M-Pesa is temporarily unavailable. Please try again.");
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL || "";
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
  const res = await fetch(`https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: req.amount,
      PartyA: req.phone,
      PartyB: shortCode,
      PhoneNumber: req.phone,
      CallBackURL: callbackUrl,
      AccountReference: req.description.slice(0, 12),
      TransactionDesc: req.description.slice(0, 20),
    }),
  });
  const data = (await res.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };

  if (data.ResponseCode !== "0") {
    await prisma.mpesaTransaction.update({
      where: { id: mpesaTx.id },
      data: { status: "FAILED", resultDesc: data.errorMessage ?? "STK request rejected" },
    });
    throw new Error(data.errorMessage ?? "STK request failed");
  }

  await prisma.mpesaTransaction.update({
    where: { id: mpesaTx.id },
    data: {
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
    },
  });

  return { mpesaTx, demo: false as const, checkoutRequestId: data.CheckoutRequestID! };
}

// Simulates the Safaricom callback for demo transactions.
export async function completeDemoStk(mpesaTransactionId: string, success: boolean) {
  const tx = await prisma.mpesaTransaction.findUnique({ where: { id: mpesaTransactionId } });
  if (!tx || tx.status !== "PENDING") return null;
  const receipt = success ? `SIM${randomToken(4).toUpperCase()}` : null;
  return prisma.mpesaTransaction.update({
    where: { id: tx.id },
    data: {
      status: success ? "SUCCESS" : "FAILED",
      resultDesc: success ? "The service request is processed successfully." : "Request cancelled by user",
      mpesaReceipt: receipt,
      payload: JSON.stringify({ simulated: true, demo: true }),
    },
  });
}

export async function getMpesaTxByCheckoutId(checkoutRequestId: string) {
  return prisma.mpesaTransaction.findFirst({ where: { checkoutRequestId } });
}
