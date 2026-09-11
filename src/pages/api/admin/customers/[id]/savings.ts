import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { ref, logAudit } from "@/lib/transactions/ledger";
import { toMoney } from "@/lib/loans/engine";

const bodySchema = z.object({
  direction: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().positive("Enter a valid amount").max(10_000_000),
  note: z.string().trim().max(200).optional(),
});

// POST /api/admin/customers/[id]/savings — admin manual adjustment of a
// customer's savings balance (add or subtract), fully ledgered.
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const id = String(req.query.id ?? "");
  const user = await prisma.user.findFirst({ where: { id, role: "CUSTOMER" } });
  if (!user) throw new ApiError(404, "Customer not found");

  const { direction, amount: rawAmount, note } = bodySchema.parse(req.body);
  const amount = Math.round(toMoney(rawAmount) * 100) / 100;
  if (amount <= 0) throw new ApiError(422, "Enter a valid amount");

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.savingsAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    const balance = toMoney(account.balance);
    const newBalance = direction === "CREDIT" ? balance + amount : balance - amount;
    if (newBalance < 0) {
      throw new ApiError(422, `Adjustment would make the balance negative (current: KES ${balance.toLocaleString()})`);
    }

    await tx.savingsAccount.update({
      where: { id: account.id },
      data: { balance: new Prisma.Decimal(newBalance) },
    });

    await tx.savingsTransaction.create({
      data: {
        reference: ref("SAV"),
        accountId: account.id,
        type: direction === "CREDIT" ? "DEPOSIT" : "WITHDRAWAL",
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(newBalance),
        status: "SUCCESSFUL",
        description: `Admin ${direction === "CREDIT" ? "credit" : "debit"}${note ? `: ${note}` : ""}`,
      },
    });

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId: user.id,
        category: "SAVINGS",
        type: direction === "CREDIT" ? "SAVINGS_DEPOSIT" : "SAVINGS_WITHDRAWAL",
        direction,
        amount: new Prisma.Decimal(amount),
        status: "SUCCESSFUL",
        description: `Savings adjustment by admin${note ? `: ${note}` : ""}`,
        relatedType: "SavingsAccount",
        relatedId: account.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        title: direction === "CREDIT" ? "Savings Credited" : "Savings Debited",
        body: `An admin ${direction === "CREDIT" ? "added" : "removed"} KES ${amount.toLocaleString()} ${note ? `(${note}) ` : ""}from your savings. New balance: KES ${newBalance.toLocaleString()}.`,
        type: "SAVINGS",
      },
    });

    await logAudit(tx, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "SAVINGS_ADJUSTED",
      entityType: "SavingsAccount",
      entityId: account.id,
      details: { userId: user.id, direction, amount, note, newBalance },
    });

    return { newBalance };
  });

  ok(res, { balance: result.newBalance, message: `Savings ${direction === "CREDIT" ? "credited" : "debited"} by KES ${amount.toLocaleString()}.` });
});
