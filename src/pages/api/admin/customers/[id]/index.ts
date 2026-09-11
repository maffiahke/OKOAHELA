import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { logAudit } from "@/lib/transactions/ledger";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

// PATCH /api/admin/customers/[id] — suspend or reactivate a customer.
// DELETE /api/admin/customers/[id] — permanently delete a customer account.
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);

  const id = String(req.query.id ?? "");
  const user = await prisma.user.findFirst({ where: { id, role: "CUSTOMER" } });
  if (!user) throw new ApiError(404, "Customer not found");

  if (req.method === "PATCH") {
    const { status } = patchSchema.parse(req.body);
    if (user.status === status) throw new ApiError(422, `Customer is already ${status.toLowerCase()}`);

    await prisma.user.update({ where: { id: user.id }, data: { status } });
    if (status === "SUSPENDED") {
      // Force-logout: kill all active sessions of the suspended user.
      await prisma.session.deleteMany({ where: { userId: user.id } });
    }
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: status === "SUSPENDED" ? "Account Suspended" : "Account Reinstated",
        body:
          status === "SUSPENDED"
            ? "Your account has been suspended. Contact support for more information."
            : "Your account has been reactivated. You can continue using OKOAHELA.",
        type: "SECURITY",
      },
    });
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: status === "SUSPENDED" ? "CUSTOMER_SUSPENDED" : "CUSTOMER_REINSTATED",
      entityType: "User",
      entityId: user.id,
    });
    return ok(res, { id: user.id, status });
  }

  if (req.method === "DELETE") {
    const [loans, apps, withdrawals] = await Promise.all([
      prisma.loan.count({ where: { userId: user.id, status: { in: ["ACTIVE", "OVERDUE"] } } }),
      prisma.loanApplication.count({ where: { userId: user.id, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED"] } } }),
      prisma.withdrawalRequest.count({ where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] } } }),
    ]);
    if (loans > 0 || apps > 0 || withdrawals > 0) {
      throw new ApiError(
        409,
        "Cannot delete a customer with active loans or pending applications/withdrawals. Suspend them instead.",
      );
    }
    const balance = await prisma.savingsAccount.findUnique({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }); // cascades to profile, sessions, loans, savings, txns…
    await logAudit(prisma, {
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "CUSTOMER_DELETED",
      entityType: "User",
      entityId: id,
      details: { phone: user.phone, savingsBalance: balance ? Number(balance.balance) : 0 },
    });
    return ok(res, { deleted: true, id });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return ok(res, null, 405);
});
