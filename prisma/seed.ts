import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRODUCTS: {
  name: string;
  amount: number;
  periodMonths: number;
  description: string;
  badge?: string;
  flatFee?: number;
}[] = [
  { name: "Okoa 250", amount: 250, periodMonths: 1, description: "Starter loan — no savings needed", badge: "Starter", flatFee: 70 },
  { name: "Okoa 500", amount: 500, periodMonths: 1, description: "Quick top-up for daily needs" },
  { name: "Okoa 1K", amount: 1000, periodMonths: 1, description: "Quick top-up for daily needs", badge: "New" },
  { name: "Okoa 2K", amount: 2000, periodMonths: 1, description: "Small emergency boost", badge: "Popular" },
  { name: "Okoa 3K", amount: 3000, periodMonths: 1, description: "Cover bills till payday", badge: "Fast Track" },
  { name: "Okoa 5K", amount: 5000, periodMonths: 2, description: "School fees made simple", badge: "Best Value" },
  { name: "Okoa 7.5K", amount: 7500, periodMonths: 2, description: "Restock your business" },
  { name: "Okoa 10K", amount: 10000, periodMonths: 3, description: "Bigger emergencies handled", badge: "Recommended" },
  { name: "Okoa 15K", amount: 15000, periodMonths: 3, description: "Family projects funded" },
  { name: "Okoa 20K", amount: 20000, periodMonths: 4, description: "Grow your hustle" },
  { name: "Okoa 30K", amount: 30000, periodMonths: 6, description: "Business expansion" },
  { name: "Okoa 50K", amount: 50000, periodMonths: 6, description: "Maximum limit product", badge: "Max Limit" },
];

async function main() {
  const adminPass = await bcrypt.hash("Admin@2024", 10);
  const custPass = await bcrypt.hash("Demo@2024", 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { phone: "254700000001" },
    update: {},
    create: {
      phone: "254700000001",
      passwordHash: adminPass,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Demo customer — Jay Venas, verified, with limit & savings
  const jay = await prisma.user.upsert({
    where: { phone: "254712345678" },
    update: {},
    create: {
      phone: "254712345678",
      passwordHash: custPass,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: jay.id },
    update: {},
    create: {
      userId: jay.id,
      fullName: "Jay Venas",
      nationalId: "12345678",
      dateOfBirth: new Date("1995-06-15"),
      mpesaNumber: "254712345678",
      kycStatus: "VERIFIED",
      loanLimit: new Prisma.Decimal(10000),
    },
  });

  const savings = await prisma.savingsAccount.upsert({
    where: { userId: jay.id },
    update: {},
    create: { userId: jay.id, balance: new Prisma.Decimal(4500) },
  });

  // Loan products — minSavings = amount / 2 (2x savings rule), flatFee only on the 250 starter
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const data = {
      name: p.name,
      amount: new Prisma.Decimal(p.amount),
      feeRate: new Prisma.Decimal(0.1),
      flatFee: p.flatFee ? new Prisma.Decimal(p.flatFee) : null,
      minSavings: new Prisma.Decimal(p.amount / 2),
      periodMonths: p.periodMonths,
      periodOptions: p.periodMonths === 1 ? "1" : p.periodMonths === 2 ? "1,2" : "1,2,3,4,6",
      description: p.description,
      badge: p.badge ?? null,
      sortOrder: i,
      active: true,
    };
    await prisma.loanProduct.upsert({
      where: { id: `seed-product-${p.amount}` },
      update: data,
      create: { id: `seed-product-${p.amount}`, ...data },
    });
  }

  // A repaid loan for history (fully repaid)
  const repaidExists = await prisma.loan.findFirst({ where: { userId: jay.id, status: "FULLY_REPAID" } });
  if (!repaidExists) {
    const product = await prisma.loanProduct.findUnique({ where: { id: "seed-product-2000" } });
    if (product) {
      const loan = await prisma.loan.create({
        data: {
          reference: "LN-SEED-REPAID",
          userId: jay.id,
          productId: product.id,
          principal: new Prisma.Decimal(2000),
          fee: new Prisma.Decimal(200),
          totalRepayment: new Prisma.Decimal(2200),
          monthlyRepayment: new Prisma.Decimal(2200),
          periodMonths: 1,
          mpesaNumber: "254712345678",
          status: "FULLY_REPAID",
          disbursedAt: new Date(Date.now() - 45 * 24 * 3600 * 1000),
          dueDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
          amountPaid: new Prisma.Decimal(2200),
          schedule: {
            create: [
              {
                installment: 1,
                amount: new Prisma.Decimal(2200),
                dueDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
                status: "PAID",
                paidAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
              },
            ],
          },
        },
      });

      await prisma.transaction.createMany({
        data: [
          {
            reference: "TXN-SEED-D1",
            userId: jay.id,
            category: "LOANS",
            type: "LOAN_DISBURSEMENT",
            direction: "CREDIT",
            amount: new Prisma.Decimal(2000),
            status: "SUCCESSFUL",
            description: "Loan disbursed to M-Pesa (Receipt SIM001)",
            relatedType: "Loan",
            relatedId: loan.id,
          },
          {
            reference: "TXN-SEED-F1",
            userId: jay.id,
            category: "REPAYMENTS",
            type: "LOAN_FEE",
            direction: "DEBIT",
            amount: new Prisma.Decimal(200),
            status: "SUCCESSFUL",
            description: "Loan processing fee",
            relatedType: "Loan",
            relatedId: loan.id,
          },
          {
            reference: "TXN-SEED-R1",
            userId: jay.id,
            category: "REPAYMENTS",
            type: "LOAN_REPAYMENT",
            direction: "DEBIT",
            amount: new Prisma.Decimal(2200),
            status: "SUCCESSFUL",
            description: "Loan repayment (Receipt SIM002)",
            relatedType: "Loan",
            relatedId: loan.id,
          },
        ],
      });

      await prisma.repayment.create({
        data: {
          reference: "RPY-SEED-1",
          loanId: loan.id,
          amount: new Prisma.Decimal(2200),
          mpesaTransactionId: "SIM002",
        },
      });
    }
  }

  // An active loan with schedule (2 installments, 1 paid)
  const activeExists = await prisma.loan.findFirst({ where: { userId: jay.id, status: "ACTIVE" } });
  if (!activeExists) {
    const product = await prisma.loanProduct.findUnique({ where: { id: "seed-product-5000" } });
    if (product) {
      const now = new Date();
      const m1 = new Date(now);
      m1.setMonth(m1.getMonth() - 0);
      const m2 = new Date(now);
      m2.setMonth(m2.getMonth() + 1);
      const loan = await prisma.loan.create({
        data: {
          reference: "LN-SEED-ACTIVE",
          userId: jay.id,
          productId: product.id,
          principal: new Prisma.Decimal(5000),
          fee: new Prisma.Decimal(500),
          totalRepayment: new Prisma.Decimal(5500),
          monthlyRepayment: new Prisma.Decimal(2750),
          periodMonths: 2,
          mpesaNumber: "254712345678",
          status: "ACTIVE",
          disbursedAt: new Date(now.getTime() - 32 * 24 * 3600 * 1000),
          dueDate: m2,
          amountPaid: new Prisma.Decimal(2750),
          schedule: {
            create: [
              {
                installment: 1,
                amount: new Prisma.Decimal(2750),
                dueDate: m1,
                status: "PAID",
                paidAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
              },
              {
                installment: 2,
                amount: new Prisma.Decimal(2750),
                dueDate: m2,
                status: "PENDING",
              },
            ],
          },
        },
      });

      await prisma.transaction.createMany({
        data: [
          {
            reference: "TXN-SEED-D2",
            userId: jay.id,
            category: "LOANS",
            type: "LOAN_DISBURSEMENT",
            direction: "CREDIT",
            amount: new Prisma.Decimal(5000),
            status: "SUCCESSFUL",
            description: "Loan disbursed to M-Pesa (Receipt SIM010)",
            relatedType: "Loan",
            relatedId: loan.id,
          },
          {
            reference: "TXN-SEED-F2",
            userId: jay.id,
            category: "REPAYMENTS",
            type: "LOAN_FEE",
            direction: "DEBIT",
            amount: new Prisma.Decimal(500),
            status: "SUCCESSFUL",
            description: "Loan processing fee",
            relatedType: "Loan",
            relatedId: loan.id,
          },
          {
            reference: "TXN-SEED-R2",
            userId: jay.id,
            category: "REPAYMENTS",
            type: "LOAN_REPAYMENT",
            direction: "DEBIT",
            amount: new Prisma.Decimal(2750),
            status: "SUCCESSFUL",
            description: "Loan repayment (Receipt SIM011)",
            relatedType: "Loan",
            relatedId: loan.id,
          },
        ],
      });

      await prisma.repayment.create({
        data: {
          reference: "RPY-SEED-2",
          loanId: loan.id,
          amount: new Prisma.Decimal(2750),
          mpesaTransactionId: "SIM011",
        },
      });

      await prisma.savingsTransaction.create({
        data: {
          reference: "SAV-SEED-1",
          accountId: savings.id,
          type: "DEPOSIT",
          amount: new Prisma.Decimal(4500),
          balanceAfter: new Prisma.Decimal(4500),
          status: "SUCCESSFUL",
          description: "M-Pesa deposit (Receipt SIM020)",
        },
      });

      await prisma.notification.createMany({
        data: [
          {
            userId: jay.id,
            title: "Welcome to Okoahela 🎉",
            body: "Your account is verified. You can now apply for loans up to KES 10,000.",
            type: "SYSTEM",
          },
          {
            userId: jay.id,
            title: "Loan Approved!",
            body: "Your loan of KES 5,000 has been sent to your M-Pesa.",
            type: "LOAN",
          },
          {
            userId: jay.id,
            title: "Payment Reminder",
            body: "Your final installment of KES 2,750 is due soon.",
            type: "REMINDER",
            read: true,
          },
        ],
      });

      await prisma.auditLog.create({
        data: {
          actorRole: "SYSTEM",
          action: "SEED_COMPLETED",
          entityType: "Database",
          entityId: "seed",
          details: JSON.stringify({ seeded: true, at: new Date().toISOString() }),
        },
      });
    }
  }

  console.log("Seed complete: admin + demo customer Jay Venas, 12 products, demo loans, savings, notifications.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
