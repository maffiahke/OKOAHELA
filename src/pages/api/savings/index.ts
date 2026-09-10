import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/savings — balance + history.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  const account = await prisma.savingsAccount.findUnique({
    where: { userId: user.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  ok(res, {
    balance: toMoney(account?.balance ?? 0),
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
