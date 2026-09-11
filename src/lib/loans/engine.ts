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

export function calcFee(amount: number, feeRate: number, flatFee = 0): number {
  if (amount < 0 || feeRate < 0 || flatFee < 0) throw new Error("Negative loan values are not allowed");
  // A flat fee replaces the percentage fee entirely (e.g. KES 70 on the KES 250 starter loan).
  const fee = flatFee > 0 ? flatFee : amount * feeRate;
  // Round to nearest whole shilling, banker-safe for x.5 cases.
  return Math.round(fee);
}

export function quoteLoan(
  amount: number,
  feeRate: number,
  periodMonths: number,
  startDate: Date = new Date(),
  flatFee = 0,
): LoanQuote {
  if (periodMonths < 1) throw new Error("Repayment period must be at least 1 month");
  const fee = calcFee(amount, feeRate, flatFee);
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

// Default limit for every customer with no savings history: a small starter
// loan with no requirements (flat KES 70 processing fee on the product).
export const DEFAULT_LOAN_LIMIT = 250;

// The loan limit is awarded from savings: every KES saved unlocks KES 2 of
// credit, floored at the KES 250 starter limit (savings of 1,000 → 2,000;
// 10,000 → 20,000). Computed live so deposits raise the limit instantly.
export function computeLoanLimit(savingsBalance: number): number {
  const fromSavings = Math.round(Math.max(0, savingsBalance) * 2);
  return Math.max(DEFAULT_LOAN_LIMIT, fromSavings);
}
