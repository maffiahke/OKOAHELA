import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";

// ── M-Pesa service (live Daraja only) ───────────────────────────────────────
// Real Safaricom Daraja integration: OAuth, STK Push, B2C payouts and the
// result-query APIs. Environment is selected with MPESA_ENV
// ("production" → api.safaricom.co.ke, anything else → sandbox).
// Transactions settle via the /api/mpesa/callback endpoint or, when the
// callback has not arrived yet, via Daraja's query APIs polled by
// /api/mpesa/status. Financial effects are applied only in lib/mpesa/settle.

export type MpesaPurpose =
  | "LOAN_APPLICATION_FEE"
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

interface DarajaConfig {
  baseUrl: string;
  key: string;
  secret: string;
  shortcode: string;
  tillNumber: string;
  transactionType: "CustomerBuyGoodsOnline" | "CustomerPayBillOnline";
  passkey: string;
  callbackUrl: string;
  env: "production" | "sandbox";
}

export function mpesaConfig(): DarajaConfig {
  const env = process.env.MPESA_ENV === "production" ? "production" : "sandbox";
  const transactionType =
    (process.env.MPESA_TRANSACTION_TYPE ?? "").trim() === "CustomerBuyGoodsOnline"
      ? "CustomerBuyGoodsOnline"
      : "CustomerPayBillOnline";
  const cfg: DarajaConfig = {
    env,
    baseUrl: env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
    key: process.env.MPESA_CONSUMER_KEY ?? "",
    secret: process.env.MPESA_CONSUMER_SECRET ?? "",
    shortcode: process.env.MPESA_SHORTCODE ?? "",
    tillNumber: process.env.MPESA_TILL_NUMBER ?? "",
    transactionType,
    passkey: process.env.MPESA_PASSKEY ?? "",
    callbackUrl: process.env.MPESA_CALLBACK_URL ?? "",
  };
  if (!cfg.key || !cfg.secret) {
    throw new ApiError(
      503,
      "M-Pesa is not configured yet — add your Daraja consumer key/secret to the server environment.",
    );
  }
  return cfg;
}

// Buy Goods sends funds to the till number, but Daraja authenticates the
// call with the REGISTERED shortcode: BusinessShortCode and the
// shortcode+passkey+timestamp password always use the shortcode — only
// PartyB becomes the till. Paybill uses the shortcode for both.
function stkAuthShortCode(cfg: DarajaConfig): string {
  return cfg.shortcode || cfg.tillNumber;
}

function stkPartyB(cfg: DarajaConfig): string {
  if (cfg.transactionType === "CustomerBuyGoodsOnline") {
    return cfg.tillNumber || cfg.shortcode;
  }
  return cfg.shortcode;
}

function stkPassword(cfg: DarajaConfig, timestamp: string): string {
  return Buffer.from(`${stkAuthShortCode(cfg)}${cfg.passkey}${timestamp}`).toString("base64");
}

// Daraja expects 2547XXXXXXXX / 2541XXXXXXXX.
function normalizeMsisdn(phone: string): string {
  let msisdn = phone.replace(/\D/g, "");
  if (msisdn.startsWith("07") || msisdn.startsWith("01")) msisdn = `254${msisdn.substring(1)}`;
  return msisdn;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function darajaToken(cfg: DarajaConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const auth = Buffer.from(`${cfg.key}:${cfg.secret}`).toString("base64");
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: string };
  if (!res.ok || !data.access_token) {
    throw new ApiError(502, "M-Pesa authentication failed. Check your Daraja consumer credentials.");
  }
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

// Daraja requires Africa/Nairobi (UTC+3) time in exactly yyyyMMddHHmmss —
// computed from UTC so the server's own timezone can never skew it.
function stkTimestamp(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const nairobi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return (
    `${nairobi.getUTCFullYear()}${pad(nairobi.getUTCMonth() + 1)}${pad(nairobi.getUTCDate())}` +
    `${pad(nairobi.getUTCHours())}${pad(nairobi.getUTCMinutes())}${pad(nairobi.getUTCSeconds())}`
  );
}

export async function initiateStkPush(req: StkRequest) {
  const cfg = mpesaConfig();
  const businessCode = stkAuthShortCode(cfg);
  const partyB = stkPartyB(cfg);
  if (!businessCode || !cfg.passkey || (cfg.transactionType === "CustomerBuyGoodsOnline" && !cfg.tillNumber)) {
    throw new ApiError(
      503,
      cfg.transactionType === "CustomerBuyGoodsOnline"
        ? "M-Pesa Buy Goods needs MPESA_SHORTCODE (registered shortcode), MPESA_TILL_NUMBER and MPESA_PASSKEY."
        : "M-Pesa is missing the shortcode/passkey configuration.",
    );
  }
  if (!cfg.callbackUrl) {
    throw new ApiError(
      503,
      "M-Pesa callback URL is not configured (MPESA_CALLBACK_URL must be publicly reachable over HTTPS).",
    );
  }

  const phone = normalizeMsisdn(req.phone);
  if (!/^254(7|1)\d{8}$/.test(phone)) {
    throw new ApiError(400, "Invalid phone number format for M-Pesa.");
  }
  const reference = `MPX-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  const timestamp = stkTimestamp();
  const password = stkPassword(cfg, timestamp);

  const token = await darajaToken(cfg);
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: businessCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: cfg.transactionType,
      Amount: Math.round(req.amount),
      PartyA: phone,
      // Buy Goods routes funds to the till; Paybill to the shortcode.
      PartyB: partyB,
      PhoneNumber: phone,
      CallBackURL: cfg.callbackUrl,
      // Daraja caps AccountReference at 12 chars and TransactionDesc at 13.
      AccountReference: (
        cfg.transactionType === "CustomerBuyGoodsOnline" ? partyB : phone.slice(-7)
      ).slice(0, 12),
      TransactionDesc: req.description.slice(0, 13),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };

  if (data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    throw new ApiError(
      502,
      data.errorMessage ?? data.ResponseDescription ?? "M-Pesa rejected the payment request. Please try again.",
    );
  }

  const mpesaTx = await prisma.mpesaTransaction.create({
    data: {
      reference,
      mode: cfg.env === "production" ? "LIVE" : "SANDBOX",
      type: "STK_PUSH",
      purpose: req.purpose,
      phone: req.phone,
      amount: new Prisma.Decimal(req.amount),
      status: "PENDING",
      relatedType: req.relatedType,
      relatedId: req.relatedId,
      merchantRequestId: data.MerchantRequestID ?? null,
      checkoutRequestId: data.CheckoutRequestID,
    },
  });

  return { mpesaTx, checkoutRequestId: data.CheckoutRequestID };
}

export interface QueryResult {
  outcome: "PENDING" | "SUCCESS" | "FAILED";
  receipt?: string | null;
  desc?: string;
}

interface MpesaTransactionLike {
  type: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
}

// Query an STK push result (used by status polling so payments settle even
// when the Safaricom callback cannot reach this server).
export async function queryStkPushResult(tx: MpesaTransactionLike): Promise<QueryResult> {
  const cfg = mpesaConfig();
  if (!tx.merchantRequestId || !tx.checkoutRequestId) return { outcome: "PENDING" };
  const timestamp = stkTimestamp();
  const password = stkPassword(cfg, timestamp);
  const token = await darajaToken(cfg);
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: stkAuthShortCode(cfg),
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: tx.checkoutRequestId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResultCode?: number | string;
    ResultDesc?: string;
    CallbackMetadata?: { Item?: { Name: string; Value: unknown }[] };
  };
  const rc = Number(data.ResultCode ?? -1);
  const desc = data.ResultDesc ?? "";
  // Success requires an explicit ResultCode 0 from the query itself — a body
  // carrying only ResponseCode "0" just means the query was delivered.
  if (data.ResultCode !== undefined && rc === 0) {
    const receipt =
      data.CallbackMetadata?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value?.toString() ?? null;
    return { outcome: "SUCCESS", receipt, desc };
  }
  // While the PIN prompt is still open on the customer's phone Daraja answers
  // 1/1033 ("processing") or a transient "request not found" code such as
  // 53001010151 when queried seconds after initiation. Treat only definitively
  // negative responses as FAILED — otherwise keep PENDING and let the callback,
  // a later poll, or the client's 5-minute timeout settle the outcome.
  const definitiveFailure =
    rc === 1032 || // PIN entry timed out or customer cancelled
    rc === 1035 || // insufficient balance
    /cancel|timed\s*out|exceeded|declin|insufficient|wrong identification|pin error|maximum/.test(
      desc.toLowerCase(),
    );
  if (!definitiveFailure) {
    return { outcome: "PENDING", desc };
  }
  return { outcome: "FAILED", desc: desc || `Result code ${rc}` };
}

function b2cInitiator() {
  return {
    initiator: process.env.MPESA_B2C_INITIATOR ?? "",
    password: process.env.MPESA_B2C_PASSWORD ?? "",
  };
}

// Real B2C payout (business → customer M-Pesa). Safaricom returns an immediate
// "accepted" response; the final result arrives via the B2C callback or is
// resolved by queryB2CResult during status polling.
export async function initiateB2CPayment(req: B2CRequest) {
  const cfg = mpesaConfig();
  const { initiator, password } = b2cInitiator();
  if (!cfg.shortcode) {
    throw new ApiError(503, "M-Pesa is missing the shortcode configuration needed for payouts.");
  }
  if (!initiator || !password) {
    throw new ApiError(503, "M-Pesa B2C is not configured — set MPESA_B2C_INITIATOR and MPESA_B2C_PASSWORD.");
  }
  if (!cfg.callbackUrl) {
    throw new ApiError(503, "M-Pesa payouts need MPESA_CALLBACK_URL set to a public HTTPS URL.");
  }
  const securityCredential = Buffer.from(`${password}${cfg.shortcode}`).toString("base64");
  const reference = `MPX-B2C-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  // Queue timeouts land on the same endpoint as payment results; derive it
  // from the callback URL's origin instead of appending to the full URL.
  let queueTimeoutUrl = cfg.callbackUrl;
  try {
    queueTimeoutUrl = `${new URL(cfg.callbackUrl).origin}/api/mpesa/callback`;
  } catch {
    /* keep configured value if it is not a valid URL */
  }

  const token = await darajaToken(cfg);
  const res = await fetch(`${cfg.baseUrl}/mpesa/b2c/v1/mpesab2c`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      InitiatorName: initiator,
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: Math.round(req.amount),
      PartyA: cfg.shortcode,
      PartyB: Number(req.phone),
      Remarks: req.description.slice(0, 20),
      QueueTimeOutURL: queueTimeoutUrl,
      Occasion: "",
      OriginatorConversationID: reference,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    MerchantRequestID?: string;
    RequestID?: string; // Daraja returns the conversation ID as RequestID
    errorMessage?: string;
  };

  if (data.ResponseCode !== "0") {
    throw new ApiError(
      502,
      data.errorMessage ?? data.ResponseDescription ?? "M-Pesa rejected the payout request. Please try again.",
    );
  }

  const mpesaTx = await prisma.mpesaTransaction.create({
    data: {
      reference,
      mode: cfg.env === "production" ? "LIVE" : "SANDBOX",
      type: req.purpose === "LOAN_DISBURSEMENT" ? "B2C_DISBURSEMENT" : "B2C_WITHDRAWAL",
      purpose: req.purpose,
      phone: req.phone,
      amount: new Prisma.Decimal(req.amount),
      status: "PENDING",
      relatedType: req.relatedType,
      relatedId: req.relatedId,
      merchantRequestId: data.MerchantRequestID ?? null,
      checkoutRequestId: data.RequestID ?? reference,
    },
  });

  return { mpesaTx, checkoutRequestId: mpesaTx.checkoutRequestId! };
}

interface B2CRequest {
  phone: string;
  amount: number;
  purpose: MpesaPurpose;
  relatedType: string;
  relatedId: string;
  description: string;
}

export async function queryB2CResult(tx: MpesaTransactionLike): Promise<QueryResult> {
  const cfg = mpesaConfig();
  const { initiator } = b2cInitiator();
  if (!initiator || !tx.checkoutRequestId) return { outcome: "PENDING" };
  const token = await darajaToken(cfg);
  const url =
    `${cfg.baseUrl}/mpesa/b2cquery/v1/${initiator}/ResultAPI` +
    `?queryRequestUniqueId=${encodeURIComponent(tx.checkoutRequestId)}&queryRequestType=TransactionB2CId`;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as {
    queryResponseCode?: string;
    queryResultCode?: string;
    queryResultDesc?: string;
    queryReceiptID?: string;
  };
  if (data.queryResponseCode !== "0") return { outcome: "PENDING", desc: data.queryResultDesc };
  const rc = Number(data.queryResultCode ?? -1);
  if (rc === 0) return { outcome: "SUCCESS", receipt: data.queryReceiptID ?? null, desc: data.queryResultDesc };
  const desc = data.queryResultDesc ?? "";
  if (/in progress|pending|ambiguous/i.test(desc) || rc === -1) return { outcome: "PENDING", desc };
  return { outcome: "FAILED", desc: desc || `Result code ${rc}` };
}

export async function getMpesaTxByCheckoutId(checkoutRequestId: string) {
  return prisma.mpesaTransaction.findFirst({ where: { checkoutRequestId } });
}
