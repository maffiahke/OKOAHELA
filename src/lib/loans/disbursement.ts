import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { toMoney } from "@/lib/loans/engine";
import { ref } from "@/lib/transactions/ledger";

// ── Loan disbursement (applied after M-Pesa success callback) ───────────────
// Idempotent: creating a loan for an application that already has one is a
// no-op. Runs inside a DB transaction so loan + schedule + ledger + audit are
// all-or-nothing.

export async function disburseLoanForApplication(applicationId: string, mpesaReceipt: string | null) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.loanApplication.findUnique({
      where: { id: applicationId },
      include: { loan: true },
    });
    if (!application) throw new Error("Application not found");
    if (application.loan) return application.loan; // idempotent
    if (application.status !== "APPROVED") throw new Error("Application is not approved");

    const now = new Date();
    const due = new Date(now);
    due.setMonth(due.getMonth() + application.periodMonths);

    // Build schedule inside same transaction.
    const base = Math.round(toMoney(application.totalRepayment) / application.periodMonths);
    const first = base + (toMoney(application.totalRepayment) - base * application.periodMonths);

    const loan = await tx.loan.create({
      data: {
        reference: `LN-${Date.now().toString(36).toUpperCase()}`,
        applicationId: application.id,
        userId: application.userId,
        productId: application.productId,
        principal: application.amount,
        fee: application.fee,
        totalRepayment: application.totalRepayment,
        monthlyRepayment: application.monthlyRepayment,
        periodMonths: application.periodMonths,
        mpesaNumber: application.mpesaNumber,
        status: "ACTIVE",
        disbursedAt: now,
        dueDate: due,
        schedule: {
          create: Array.from({ length: application.periodMonths }, (_, i) => ({
            installment: i + 1,
            amount: new Prisma.Decimal(i === 0 ? first : base),
            dueDate: (() => {
              const d = new Date(now);
              d.setMonth(d.getMonth() + i + 1);
              return d;
            })(),
          })),
        },
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId: application.userId,
        category: "LOANS",
        type: "LOAN_DISBURSEMENT",
        direction: "CREDIT",
        amount: application.amount,
        status: "SUCCESSFUL",
        description: `Loan disbursed to M-Pesa${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
        relatedType: "Loan",
        relatedId: loan.id,
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId: application.userId,
        category: "REPAYMENTS",
        type: "LOAN_FEE",
        direction: "DEBIT",
        amount: application.fee,
        status: "SUCCESSFUL",
        description: "Loan processing fee",
        relatedType: "Loan",
        relatedId: loan.id,
      },
    });

    await tx.loanApplication.update({
      where: { id: application.id },
      data: { status: "DISBURSED" },
    });

    await tx.auditLog.create({
      data: {
        actorRole: "SYSTEM",
        action: "LOAN_DISBURSED",
        entityType: "Loan",
        entityId: loan.id,
        details: JSON.stringify({ applicationId: application.id, receipt: mpesaReceipt }),
      },
    });

    await tx.notification.create({
      data: {
        userId: application.userId,
        title: "Loan Approved!",
        body: `Your loan of KES ${toMoney(application.amount).toLocaleString()} has been sent to your M-Pesa.`,
        type: "LOAN",
      },
    });

    return loan;
  });
}

// ── Loan repayment (applied after M-Pesa success callback) ──────────────────
export async function applyLoanRepayment(loanId: string, amount: number, mpesaReceipt: string | null) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error("Loan not found");
    if (loan.status === "FULLY_REPAID") throw new Error("Loan is already fully repaid");

    const paid = toMoney(loan.amountPaid) + amount;
    const total = toMoney(loan.totalRepayment);
    const fullyRepaid = paid >= total;

    await tx.repayment.create({
      data: {
        reference: ref("RPY"),
        loanId: loan.id,
        amount: new Prisma.Decimal(amount),
        mpesaTransactionId: mpesaReceipt,
      },
    });

    // Mark oldest pending schedule items as paid, in order.
    let remaining = amount;
    const items = await tx.repaymentScheduleItem.findMany({
      where: { loanId: loan.id, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { installment: "asc" },
    });
    for (const item of items) {
      if (remaining <= 0) break;
      const itemAmt = toMoney(item.amount);
      if (remaining >= itemAmt) {
        await tx.repaymentScheduleItem.update({
          where: { id: item.id },
          data: { status: "PAID", paidAt: new Date() },
        });
        remaining -= itemAmt;
      }
    }

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        amountPaid: new Prisma.Decimal(paid),
        status: fullyRepaid ? "FULLY_REPAID" : loan.status === "OVERDUE" ? "OVERDUE" : "ACTIVE",
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId: loan.userId,
        category: "REPAYMENTS",
        type: "LOAN_REPAYMENT",
        direction: "DEBIT",
        amount: new Prisma.Decimal(amount),
        status: "SUCCESSFUL",
        description: `Loan repayment${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
        relatedType: "Loan",
        relatedId: loan.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorRole: "SYSTEM",
        action: "LOAN_REPAYMENT",
        entityType: "Loan",
        entityId: loan.id,
        details: JSON.stringify({ amount, fullyRepaid }),
      },
    });

    if (fullyRepaid) {
      await tx.notification.create({
        data: {
          userId: loan.userId,
          title: "Loan Fully Repaid 🎉",
          body: "Congratulations! Your loan has been fully repaid. Your loan limit may increase.",
          type: "LOAN",
        },
      });
    }

    return { fullyRepaid, amountPaid: paid, total };
  });
}
