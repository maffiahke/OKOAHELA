import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { logAudit } from "@/lib/transactions/ledger";

const patchSchema = z.object({
  active: z.boolean(),
});

const putSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(60),
  amount: z.number().positive("Enter a valid loan amount").max(10_000_000),
  feeRate: z
    .number()
    .min(0, "Fee rate cannot be negative")
    .max(1, "Fee rate is a fraction, e.g. 0.1 for 10%"),
  flatFee: z.number().min(0).max(100_000).optional(),
  minSavings: z.number().min(0).max(10_000_000).optional(),
  periodMonths: z.number().int().min(1).max(60).optional(),
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

// DELETE /api/admin/products/[id] — delete a product, or deactivate it when
// loans/applications already reference it (FK restrict).
// PATCH /api/admin/products/[id] — toggle active flag.
// PUT  /api/admin/products/[id] — full update.
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);

  const id = String(req.query.id ?? "");
  const product = await prisma.loanProduct.findUnique({
    where: { id },
    include: { _count: { select: { loans: true, applications: true } } },
  });
  if (!product) throw new ApiError(404, "Product not found");

  if (req.method === "PATCH") {
    const { active } = patchSchema.parse(req.body);
    await prisma.loanProduct.update({ where: { id }, data: { active } });
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: active ? "LOAN_PRODUCT_ACTIVATED" : "LOAN_PRODUCT_DEACTIVATED",
      entityType: "LoanProduct",
      entityId: id,
    });
    return ok(res, { id, active });
  }

  if (req.method === "PUT") {
    const body = putSchema.parse(req.body);
    const options = body.periodOptions ?? [];
    const periodOptions = (options.length ? options : [body.periodMonths ?? 1]).join(",");
    const product = await prisma.loanProduct.update({
      where: { id },
      data: {
        name: body.name,
        amount: body.amount,
        feeRate: body.feeRate,
        flatFee: body.flatFee !== undefined && body.flatFee > 0 ? new Prisma.Decimal(body.flatFee) : null,
        minSavings: new Prisma.Decimal(body.minSavings ?? 0),
        periodMonths: body.periodMonths ?? (options[0] ?? 1),
        periodOptions,
        description: body.description || null,
        badge: body.badge || null,
        sortOrder: body.sortOrder ?? 0,
        active: body.active ?? true,
      },
    });
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "LOAN_PRODUCT_UPDATED",
      entityType: "LoanProduct",
      entityId: product.id,
      details: { name: product.name },
    });
    return ok(res, { id: product.id });
  }

  if (req.method === "DELETE") {
    const usage = product._count.loans + product._count.applications;
    if (usage > 0) {
      await prisma.loanProduct.update({ where: { id }, data: { active: false } });
      await logAudit(prisma, {
        actorId: admin.id,
        actorRole: "ADMIN",
        action: "LOAN_PRODUCT_DEACTIVATED",
        entityType: "LoanProduct",
        entityId: id,
        details: { reason: `in use by ${usage} loan(s)/application(s)` },
      });
      return ok(res, {
        id,
        deactivated: true,
        message: `"${product.name}" is used by ${usage} loan(s)/application(s), so it was deactivated instead of deleted.`,
      });
    }
    await prisma.loanProduct.delete({ where: { id } });
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "LOAN_PRODUCT_DELETED",
      entityType: "LoanProduct",
      entityId: id,
      details: { name: product.name },
    });
    return ok(res, { id, deleted: true, message: `"${product.name}" deleted.` });
  }

  res.setHeader("Allow", "DELETE, PATCH, PUT");
  return ok(res, null, 405);
});
