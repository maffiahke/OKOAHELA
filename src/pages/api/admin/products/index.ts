import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";
import { logAudit } from "@/lib/transactions/ledger";

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(60),
  amount: z.number().positive("Enter a valid loan amount").max(10_000_000),
  feeRate: z.number().min(0, "Fee rate cannot be negative").max(1, "Fee rate is a fraction, e.g. 0.1 for 10%"),
  flatFee: z.number().min(0).max(100_000).optional(),
  minSavings: z.number().min(0).max(10_000_000).optional(),
  periodMonths: z.number().int().min(1).max(60),
  periodOptions: z
    .array(z.number().int().min(1).max(60))
    .min(1, "Pick at least one repayment period")
    .max(12)
    .optional(),
  description: z.string().trim().max(200).optional(),
  badge: z.string().trim().max(30).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/products — all products incl. inactive.
// POST /api/admin/products — create a loan product.
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);

  if (req.method === "GET") {
    const products = await prisma.loanProduct.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { loans: true, applications: true } } },
    });
    return ok(
      res,
      products.map((p) => ({
        id: p.id,
        name: p.name,
        amount: toMoney(p.amount),
        feeRate: toMoney(p.feeRate),
        flatFee: toMoney(p.flatFee ?? 0),
        minSavings: toMoney(p.minSavings),
        periodMonths: p.periodMonths,
        periodOptions: p.periodOptions.split(",").map((s) => parseInt(s, 10)).filter(Boolean),
        description: p.description,
        badge: p.badge,
        active: p.active,
        sortOrder: p.sortOrder,
        usage: p._count.loans + p._count.applications,
      })),
    );
  }

  if (req.method === "POST") {
    const body = createSchema.parse(req.body);
    const options = body.periodOptions ?? [];
    const periodOptions = (options.length ? options : [body.periodMonths]).join(",");
    const product = await prisma.loanProduct.create({
      data: {
        name: body.name,
        amount: body.amount,
        feeRate: body.feeRate,
        flatFee: body.flatFee !== undefined && body.flatFee > 0 ? new Prisma.Decimal(body.flatFee) : null,
        minSavings: new Prisma.Decimal(body.minSavings ?? 0),
        periodMonths: body.periodMonths,
        periodOptions,
        description: body.description || null,
        badge: body.badge || null,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "LOAN_PRODUCT_CREATED",
      entityType: "LoanProduct",
      entityId: product.id,
      details: { name: product.name, amount: toMoney(product.amount) },
    });
    return ok(res, { id: product.id }, 201);
  }

  res.setHeader("Allow", "GET, POST");
  return ok(res, null, 405);
});
