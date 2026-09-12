import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/dashboard — everything the customer home screen needs in one call.
export default withApi(async (req, res) => {
  const user = await requireUser(req);

  const [profile, savings, activeLoan, notifications, transactions, topProduct] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.savingsAccount.findUnique({ where: { userId: user.id } }),
    prisma.loan.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "OVERDUE"] } },
      include: { schedule: { orderBy: { installment: "asc" } } },
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.loanProduct.findFirst({
      where: { active: true },
      orderBy: { amount: "desc" },
    }),
  ]);

  const nextInstallment =
    activeLoan?.schedule.find((s) => s.status === "PENDING" || s.status === "OVERDUE") ?? null;

  ok(res, {
    user: {
      id: user.id,
      fullName: profile?.fullName ?? "Customer",
      phone: user.phone,
      kycStatus: profile?.kycStatus ?? "UNVERIFIED",
    },
    loanLimit: topProduct ? toMoney(topProduct.amount) : 0,
    savingsBalance: toMoney(savings?.balance ?? 0),
    activeLoan: activeLoan
      ? {
          id: activeLoan.id,
          reference: activeLoan.reference,
          principal: toMoney(activeLoan.principal),
          fee: toMoney(activeLoan.fee),
          totalRepayment: toMoney(activeLoan.totalRepayment),
          amountPaid: toMoney(activeLoan.amountPaid),
          monthlyRepayment: toMoney(activeLoan.monthlyRepayment),
          periodMonths: activeLoan.periodMonths,
          status: activeLoan.status,
          dueDate: activeLoan.dueDate,
        }
      : null,
    nextRepayment: nextInstallment
      ? {
          amount: toMoney(nextInstallment.amount),
          dueDate: nextInstallment.dueDate,
          installment: nextInstallment.installment,
          status: nextInstallment.status,
          loanId: activeLoan!.id,
        }
      : null,
    unreadNotifications: notifications,
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      direction: t.direction,
      amount: toMoney(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
});
