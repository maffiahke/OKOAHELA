import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin } from "@/lib/api";
import { toMoney } from "@/lib/loans/engine";

// GET /api/admin/customers — customer list with loan/savings aggregates.
export default withApi(async (req, res) => {
  await requireAdmin(req);
  const q = String(req.query.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? {
            OR: [{ profile: { fullName: { contains: q } } }, { phone: { contains: q } }],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { profile: true, savingsAccount: true, loans: { where: { status: { in: ["ACTIVE", "OVERDUE"] } } } },
  });

  ok(
    res,
    users.map((u) => ({
      id: u.id,
      fullName: u.profile?.fullName ?? "—",
      phone: u.phone,
      status: u.status,
      kycStatus: u.profile?.kycStatus ?? "UNVERIFIED",
      loanLimit: toMoney(u.profile?.loanLimit ?? 0),
      savings: toMoney(u.savingsAccount?.balance ?? 0),
      activeLoans: u.loans.length,
      createdAt: u.createdAt,
    })),
  );
});
