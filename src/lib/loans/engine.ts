import { Prisma } from "@prisma/client";

// ── Loan engine ─────────────────────────────────────────────────────────────
// All money math is done in whole KES (fees are 10% flat by default). Values
// are computed server-side only — never trust amounts from the client.

export interface LoanQuote {
  amount: number;
  fee: number;
  totalRepayment: number;
  periodMonths: number;
  monthlyRepayment: number;
  schedule: { installment: number; amount: number; dueDate: Date }[];
}

export function calcFee(amount: number, feeRate: number): number {
  if (amount < 0 || feeRate < 0) throw new Error("Negative loan values are not allowed");
  const fee = amount * feeRate;
  // Round to nearest whole shilling, banker-safe for x.5 cases.
  return Math.round(fee);
}

export function quoteLoan(
  amount: number,
  feeRate: number,
  periodMonths: number,
  startDate: Date = new Date(),
): LoanQuote {
  if (periodMonths < 1) throw new Error("Repayment period must be at least 1 month");
  const fee = calcFee(amount, feeRate);
  const total = amount + fee;

  // Split total across months; the first installment absorbs rounding remainder.
  const base = Math.floor((total / periodMonths) * 100) / 100;
  const monthly = Math.round(base);
  let assigned = monthly * periodMonths;
  let first = monthly + (total - assigned);
  // Keep installments positive
  if (first <= 0) {
    first = monthly;
  }

  const schedule: LoanQuote["schedule"] = [];
  for (let i = 1; i <= periodMonths; i++) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i);
    schedule.push({ installment: i, amount: i === 1 ? first : monthly, dueDate: due });
  }

  return { amount, fee, totalRepayment: total, periodMonths, monthlyRepayment: monthly, schedule };
}

export function toMoney(v: Prisma.Decimal | number | string): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Default starting limit for newly verified customers (configurable in prod).
export const STARTING_LOAN_LIMIT = 10_000;
