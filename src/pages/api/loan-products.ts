import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/loan-products — public list of active loan products.
export default withApi(async (req, res) => {
  const products = await prisma.loanProduct.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  ok(
    res,
    products.map((p) => ({
      id: p.id,
      name: p.name,
      amount: toMoney(p.amount),
      feeRate: toMoney(p.feeRate),
      periodMonths: p.periodMonths,
      periodOptions: p.periodOptions.split(",").map((s) => parseInt(s, 10)).filter(Boolean),
      description: p.description,
    })),
  );
});
