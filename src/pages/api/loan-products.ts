import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok } from "@/lib/api";
import { toMoney, calcFee, computeLoanLimit } from "@/lib/loans/engine";
import { getSessionUser } from "@/lib/auth/guards";

// GET /api/loan-products — active loan products with per-customer unlock
// state. Products are unlocked for everyone; a product is only locked if an
// admin has explicitly set a minimum savings requirement on it.
export default withApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const [products, user] = await Promise.all([
    prisma.loanProduct.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSessionUser(req).catch(() => null),
  ]);

  let savingsBalance = 0;
  let limit = 0;
  if (user) {
    const account = await prisma.savingsAccount.findUnique({ where: { userId: user.id } });
    savingsBalance = toMoney(account?.balance ?? 0);
    limit = computeLoanLimit(savingsBalance);
  }

  ok(res, {
    savingsBalance,
    loanLimit: limit,
    products: products.map((p) => {
      const amount = toMoney(p.amount);
      const flatFee = toMoney(p.flatFee ?? 0);
      const fee = calcFee(amount, toMoney(p.feeRate), flatFee);
      const minSavings = toMoney(p.minSavings);
      return {
        id: p.id,
        name: p.name,
        amount,
        feeRate: toMoney(p.feeRate),
        flatFee,
        fee,
        periodMonths: p.periodMonths,
        periodOptions: p.periodOptions.split(",").map((s) => parseInt(s, 10)).filter(Boolean),
        description: p.description,
        badge: p.badge,
        minSavings,
        // Only locked when logged out or when an admin has set a savings
        // requirement the customer has not met yet.
        locked: !user || savingsBalance < minSavings,
      };
    }),
  });
});

