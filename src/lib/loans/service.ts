import { prisma } from "@/lib/db";
import { quoteLoan, toMoney, STARTING_LOAN_LIMIT, AUTO_APPROVE_THRESHOLD } from "@/lib/loans/engine";
import { ApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";

export interface ApplyLoanInput {
  userId: string;
  productId: string;
  periodMonths: number;
  mpesaNumber: string;
}

export async function applyForLoan(input: ApplyLoanInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { profile: true },
  });
  if (!user) throw new ApiError(404, "Account not found");
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "Your account must be verified before applying for a loan", "ACCOUNT_NOT_ACTIVE");
  }
  if (!user.profile) throw new ApiError(400, "Profile incomplete");

  const product = await prisma.loanProduct.findUnique({ where: { id: input.productId } });
  if (!product || !product.active) throw new ApiError(404, "This loan product is not available");

  // Rule 1: amount must match the product exactly (products are fixed-bundle).
  const amount = toMoney(product.amount);
  const limit = toMoney(user.profile.loanLimit) || STARTING_LOAN_LIMIT;
  if (amount > limit) {
    throw new ApiError(403, `This loan exceeds your limit of KES ${limit.toLocaleString()}.`, "LIMIT_EXCEEDED");
  }

  // Rule 2: no conflicting active loans (single active loan policy).
  const activeLoan = await prisma.loan.findFirst({
    where: { userId: input.userId, status: { in: ["ACTIVE", "OVERDUE"] } },
  });
  if (activeLoan) {
    throw new ApiError(
      409,
      "You have an active loan. Repay it first before applying for a new one.",
      "ACTIVE_LOAN_EXISTS",
    );
  }

  // Rule 3: no other pending application.
  const pendingApp = await prisma.loanApplication.findFirst({
    where: { userId: input.userId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
  });
  if (pendingApp) {
    throw new ApiError(409, "You already have an application being processed.", "PENDING_APPLICATION");
  }

  const quote = quoteLoan(amount, toMoney(product.feeRate), input.periodMonths);

  const reference = `APP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

  const application = await prisma.loanApplication.create({
    data: {
      reference,
      userId: input.userId,
      productId: product.id,
      amount: new Prisma.Decimal(quote.amount),
      fee: new Prisma.Decimal(quote.fee),
      totalRepayment: new Prisma.Decimal(quote.totalRepayment),
      monthlyRepayment: new Prisma.Decimal(quote.monthlyRepayment),
      periodMonths: quote.periodMonths,
      mpesaNumber: input.mpesaNumber,
      // Auto-approve small loans instantly (demo policy; configurable).
      status: quote.amount <= AUTO_APPROVE_THRESHOLD ? "APPROVED" : "PENDING",
      reviewedBy: quote.amount <= AUTO_APPROVE_THRESHOLD ? "SYSTEM" : null,
      reviewedAt: quote.amount <= AUTO_APPROVE_THRESHOLD ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.userId,
      actorRole: "CUSTOMER",
      action: "LOAN_APPLICATION_CREATED",
      entityType: "LoanApplication",
      entityId: application.id,
      details: JSON.stringify({ amount: quote.amount, periodMonths: quote.periodMonths, autoApproved: quote.amount <= AUTO_APPROVE_THRESHOLD }),
    },
  });

  return application;
}
