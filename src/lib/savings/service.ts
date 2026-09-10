import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { toMoney } from "@/lib/loans/engine";
import { ref } from "@/lib/transactions/ledger";

// ── Savings engine ──────────────────────────────────────────────────────────
// Deposit: applied after M-Pesa STK success callback.
// Withdrawal: applied after B2C payout success callback. Both are idempotent
// per M-Pesa transaction reference and run in DB transactions.

export async function applySavingsDeposit(userId: string, amount: number, mpesaReceipt: string | null) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.savingsAccount.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    if (amount <= 0) throw new Error("Deposit amount must be positive");
    const newBalance = toMoney(account.balance) + amount;

    await tx.savingsAccount.update({
      where: { id: account.id },
      data: { balance: new Prisma.Decimal(newBalance) },
    });

    await tx.savingsTransaction.create({
      data: {
        reference: ref("SAV"),
        accountId: account.id,
        type: "DEPOSIT",
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(newBalance),
        status: "SUCCESSFUL",
        description: `M-Pesa deposit${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId,
        category: "SAVINGS",
        type: "SAVINGS_DEPOSIT",
        direction: "CREDIT",
        amount: new Prisma.Decimal(amount),
        status: "SUCCESSFUL",
        description: `Savings deposit${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
        relatedType: "SavingsAccount",
        relatedId: account.id,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Savings Deposit Successful",
        body: `KES ${amount.toLocaleString()} has been added to your savings.`,
        type: "SAVINGS",
      },
    });

    return newBalance;
  });
}

export async function applySavingsWithdrawal(userId: string, amount: number, mpesaReceipt: string | null) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.savingsAccount.findUnique({ where: { userId } });
    if (!account) throw new Error("Savings account not found");
    const balance = toMoney(account.balance);
    if (amount <= 0) throw new Error("Withdrawal amount must be positive");
    if (amount > balance) throw new Error("Insufficient savings balance");

    const newBalance = balance - amount;
    await tx.savingsAccount.update({
      where: { id: account.id },
      data: { balance: new Prisma.Decimal(newBalance) },
    });

    await tx.savingsTransaction.create({
      data: {
        reference: ref("SAV"),
        accountId: account.id,
        type: "WITHDRAWAL",
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(newBalance),
        status: "SUCCESSFUL",
        description: `M-Pesa withdrawal${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId,
        category: "SAVINGS",
        type: "SAVINGS_WITHDRAWAL",
        direction: "DEBIT",
        amount: new Prisma.Decimal(amount),
        status: "SUCCESSFUL",
        description: `Savings withdrawal${mpesaReceipt ? ` (Receipt ${mpesaReceipt})` : ""}`,
        relatedType: "SavingsAccount",
        relatedId: account.id,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Withdrawal Successful",
        body: `KES ${amount.toLocaleString()} has been sent to your M-Pesa.`,
        type: "SAVINGS",
      },
    });

    return newBalance;
  });
}

// Settlement hook: an admin-approved WithdrawalRequest payout succeeded —
// debit the balance and close the request. Safe against duplicate callbacks
// (COMPLETED requests are skipped).
export async function completeWithdrawalRequest(requestId: string, amount: number, receipt: string | null) {
  const request = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status === "COMPLETED") return;
  await applySavingsWithdrawal(request.userId, amount, receipt);
  await prisma.withdrawalRequest.update({ where: { id: requestId }, data: { status: "COMPLETED" } });
}

// Failure hook: the B2C payout to the customer failed — nothing was debited,
// just close the request and tell the customer.
export async function failWithdrawalRequest(requestId: string) {
  const closed = await prisma.withdrawalRequest.updateMany({
    where: { id: requestId, status: "APPROVED" },
    data: { status: "FAILED" },
  });
  if (closed.count !== 1) return;
  const request = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
  if (!request) return;
  await prisma.notification.create({
    data: {
      userId: request.userId,
      title: "Withdrawal could not be completed",
      body: `Your KES ${toMoney(request.amount).toLocaleString()} withdrawal failed and your savings balance was not debited. Please try again.`,
      type: "SAVINGS",
    },
  });
}
