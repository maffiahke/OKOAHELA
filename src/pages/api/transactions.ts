import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import type { Prisma } from "@prisma/client";

// GET /api/transactions?category=&page= — filterable ledger for the customer.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  const category = String(req.query.category ?? "ALL").toUpperCase();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const take = 20;

  const where: Prisma.TransactionWhereInput = { userId: user.id };
  if (category !== "ALL") where.category = category;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.transaction.count({ where }),
  ]);

  ok(res, {
    items: items.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      category: t.category,
      direction: t.direction,
      amount: toMoney(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    })),
    page,
    pages: Math.ceil(total / take),
    total,
  });
});
