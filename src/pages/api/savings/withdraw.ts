import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError, rateLimit } from "@/lib/api";
import { ref } from "@/lib/transactions/ledger";
import { toMoney } from "@/lib/loans/engine";

const bodySchema = z.object({
  amount: z.number().positive("Enter a valid amount").max(300000, "Maximum withdrawal is KES 300,000"),
  mpesaNumber: z
    .string()
    .regex(/^2547\d{8}$|^2541\d{8}$/, "Enter a valid Safaricom number (e.g. 2547XXXXXXXX).")
    .optional(),
});

// POST /api/savings/withdraw — queues a payout request. Nothing is sent to
// M-Pesa until an admin approves it (POST /api/admin/withdrawals/[id]/decision);
// the savings balance is debited only when the approved payout settles.
export default withApi(async (req, res) => {
  const user = await requireUser(req);
  rateLimit(req, "savings-withdraw", 10, 60_000);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? "Invalid input", "VALIDATION");
  const amount = Math.round(parsed.data.amount);

  const account = await prisma.savingsAccount.findUnique({ where: { userId: user.id } });
  const balance = toMoney(account?.balance ?? 0);
  if (!account || amount > balance) {
    throw new ApiError(422, "Insufficient savings balance");
  }
  if (amount < 50) throw new ApiError(422, "Minimum withdrawal is KES 50");

  const open = await prisma.withdrawalRequest.count({
    where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (open >= 3) throw new ApiError(422, "You already have pending withdrawal requests. Please wait for them to be processed.");

  const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  const request = await prisma.withdrawalRequest.create({
    data: {
      reference: ref("WD"),
      userId: user.id,
      amount,
      mpesaNumber: parsed.data.mpesaNumber ?? profile?.mpesaNumber ?? user.phone,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: "CUSTOMER",
      action: "SAVINGS_WITHDRAWAL_REQUESTED",
      entityType: "WithdrawalRequest",
      entityId: request.id,
      details: `KES ${amount} to ${request.mpesaNumber}`,
    },
  });

  ok(
    res,
    {
      id: request.id,
      reference: request.reference,
      amount,
      status: "PENDING",
      message: "Withdrawal requested — an admin will review it shortly.",
    },
    202,
  );
});
