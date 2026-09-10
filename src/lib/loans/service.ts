import { prisma } from "@/lib/db";
import { quoteLoan, toMoney, STARTING_LOAN_LIMIT } from "@/lib/loans/engine";
import { ApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";
import { ref } from "@/lib/transactions/ledger";

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

  // Rule 3: no other application in flight (including unpaid ones).
  const pendingApp = await prisma.loanApplication.findFirst({
    where: { userId: input.userId, status: { in: ["AWAITING_PAYMENT", "PENDING", "UNDER_REVIEW"] } },
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
      // Applications wait for the application-fee STK to settle (settle.ts
      // flips AWAITING_PAYMENT → PENDING), then an admin reviews them.
      status: "AWAITING_PAYMENT",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.userId,
      actorRole: "CUSTOMER",
      action: "LOAN_APPLICATION_CREATED",
      entityType: "LoanApplication",
      entityId: application.id,
      details: JSON.stringify({ amount: quote.amount, fee: quote.fee, periodMonths: quote.periodMonths }),
    },
  });

  return application;
}

// Remove an application whose fee STK could not be initiated.
export async function discardUnpaidApplication(applicationId: string) {
  await prisma.loanApplication.deleteMany({ where: { id: applicationId, status: "AWAITING_PAYMENT" } });
}

// Settlement hook: the application fee was received → the application is now
// queued for manual admin review. Runs inside the settle claim, so duplicate
// callbacks are a no-op.
export async function applyLoanApplicationFee(applicationId: string, receipt: string | null) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.loanApplication.updateMany({
      where: { id: applicationId, status: "AWAITING_PAYMENT" },
      data: { status: "PENDING" },
    });
    if (claimed.count !== 1) return;
    const app = await tx.loanApplication.findUnique({ where: { id: applicationId } });
    if (!app) return;

    await tx.transaction.create({
      data: {
        reference: ref("TXN"),
        userId: app.userId,
        category: "LOANS",
        type: "LOAN_FEE",
        direction: "CREDIT",
        amount: app.fee,
        status: "SUCCESSFUL",
        description: `Loan application fee${receipt ? ` (Receipt ${receipt})` : ""}`,
        relatedType: "LoanApplication",
        relatedId: app.id,
      },
    });
    await tx.notification.create({
      data: {
        userId: app.userId,
        title: "Application fee received",
        body: "Your loan application has been submitted and is awaiting review.",
        type: "LOAN",
      },
    });
  });
}

// Failure hook: fee never paid → cancel the application.
export async function failLoanApplicationFee(applicationId: string) {
  const cancelled = await prisma.loanApplication.updateMany({
    where: { id: applicationId, status: "AWAITING_PAYMENT" },
    data: { status: "CANCELLED" },
  });
  if (cancelled.count !== 1) return;
  const app = await prisma.loanApplication.findUnique({ where: { id: applicationId } });
  if (!app) return;
  await prisma.notification.create({
    data: {
      userId: app.userId,
      title: "Application not submitted",
      body: "The application fee payment did not complete, so your loan application was cancelled. You can re-apply anytime.",
      type: "LOAN",
    },
  });
}
