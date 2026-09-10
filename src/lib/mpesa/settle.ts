import { prisma } from "@/lib/db";
import { disburseLoanForApplication, applyLoanRepayment } from "@/lib/loans/disbursement";
import { applySavingsDeposit, applySavingsWithdrawal, completeWithdrawalRequest } from "@/lib/savings/service";
import { applyLoanApplicationFee, failLoanApplicationFee } from "@/lib/loans/service";
import { failWithdrawalRequest } from "@/lib/savings/service";
import { toMoney } from "@/lib/loans/engine";
import type { MpesaTransaction } from "@prisma/client";

// ── M-Pesa settlement ───────────────────────────────────────────────────────
// The ONLY module allowed to turn an M-Pesa result into financial effects.
// Idempotency: a PENDING → SUCCESS/FAILED transition is claimed atomically via
// updateMany; only the caller that wins the claim applies effects, so duplicate
// callbacks can never double-credit or double-debit.

async function claimSettled(id: string, status: "SUCCESS" | "FAILED", receipt: string | null, desc: string) {
  const res = await prisma.mpesaTransaction.updateMany({
    where: { id, status: "PENDING" },
    data: { status, mpesaReceipt: receipt, resultDesc: desc },
  });
  return res.count === 1;
}

async function applyEffects(tx: MpesaTransaction, receipt: string | null) {
  const amount = toMoney(tx.amount);
  switch (tx.purpose) {
    case "LOAN_DISBURSEMENT":
      await disburseLoanForApplication(tx.relatedId!, receipt);
      break;
    case "LOAN_APPLICATION_FEE":
      await applyLoanApplicationFee(tx.relatedId!, receipt);
      break;
    case "LOAN_REPAYMENT":
      await applyLoanRepayment(tx.relatedId!, amount, receipt);
      break;
    case "SAVINGS_DEPOSIT":
      await applySavingsDeposit(tx.relatedId!, amount, receipt);
      break;
    case "SAVINGS_WITHDRAWAL":
      if (tx.relatedType === "WithdrawalRequest") {
        await completeWithdrawalRequest(tx.relatedId!, amount, receipt);
      } else {
        // Legacy payouts related directly to the user id.
        await applySavingsWithdrawal(tx.relatedId!, amount, receipt);
      }
      break;
    default:
      throw new Error(`Unknown M-Pesa purpose: ${tx.purpose}`);
  }
}

export async function settleMpesaSuccess(mpesaTxId: string, receipt: string | null) {
  const tx = await prisma.mpesaTransaction.findUnique({ where: { id: mpesaTxId } });
  if (!tx) return null;
  if (!(await claimSettled(tx.id, "SUCCESS", receipt, "The service request is processed successfully."))) {
    return prisma.mpesaTransaction.findUnique({ where: { id: mpesaTxId } });
  }
  try {
    await applyEffects(tx, receipt);
  } catch (err) {
    // Roll the claim back so the operation can be retried (e.g. by a callback).
    await prisma.mpesaTransaction.update({
      where: { id: tx.id },
      data: { status: "PENDING", mpesaReceipt: null, resultDesc: `Settlement retry: ${(err as Error).message}` },
    });
    throw err;
  }
  return prisma.mpesaTransaction.findUnique({ where: { id: mpesaTxId } });
}

export async function settleMpesaFailure(mpesaTxId: string, reason: string) {
  const tx = await prisma.mpesaTransaction.findUnique({ where: { id: mpesaTxId } });
  if (!tx) return null;
  const claimed = await claimSettled(tx.id, "FAILED", null, reason);
  if (claimed && tx.relatedId) {
    if (tx.purpose === "LOAN_APPLICATION_FEE") {
      await failLoanApplicationFee(tx.relatedId);
    } else if (tx.purpose === "SAVINGS_WITHDRAWAL" && tx.relatedType === "WithdrawalRequest") {
      await failWithdrawalRequest(tx.relatedId);
    }
  }
  return prisma.mpesaTransaction.findUnique({ where: { id: mpesaTxId } });
}

// Resolves the owning user of an M-Pesa transaction (no userId column —
// ownership is derived from the related entity).
export async function resolveMpesaOwner(tx: MpesaTransaction): Promise<string | null> {
  if (tx.purpose === "SAVINGS_DEPOSIT") return tx.relatedId;
  if (tx.purpose === "SAVINGS_WITHDRAWAL") {
    if (tx.relatedType === "WithdrawalRequest" && tx.relatedId) {
      const request = await prisma.withdrawalRequest.findUnique({ where: { id: tx.relatedId } });
      return request?.userId ?? null;
    }
    return tx.relatedId;
  }
  if ((tx.purpose === "LOAN_DISBURSEMENT" || tx.purpose === "LOAN_APPLICATION_FEE") && tx.relatedId) {
    const app = await prisma.loanApplication.findUnique({ where: { id: tx.relatedId } });
    return app?.userId ?? null;
  }
  if (tx.purpose === "LOAN_REPAYMENT" && tx.relatedId) {
    const loan = await prisma.loan.findUnique({ where: { id: tx.relatedId } });
    return loan?.userId ?? null;
  }
  return null;
}
