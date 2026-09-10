import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/savings — balance + history + open withdrawal requests.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  const [account, withdrawals] = await Promise.all([
    prisma.savingsAccount.findUnique({
      where: { userId: user.id },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  ok(res, {
    balance: toMoney(account?.balance ?? 0),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      reference: w.reference,
      amount: toMoney(w.amount),
      mpesaNumber: w.mpesaNumber,
      status: w.status,
      createdAt: w.createdAt,
    })),
    transactions:
      account?.transactions.map((t) => ({
        id: t.id,
        reference: t.reference,
        type: t.type,
        amount: toMoney(t.amount),
        balanceAfter: toMoney(t.balanceAfter),
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })) ?? [],
  });
});
