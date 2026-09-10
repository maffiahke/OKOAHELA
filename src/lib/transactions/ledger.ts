import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { toMoney } from "@/lib/loans/engine";

// ── Financial ledger ────────────────────────────────────────────────────────
// Every balance change is represented by an immutable Transaction record and
// applied inside a database transaction. Balances are always reconcilable
// from the ledger (sum of CREDIT - DEBIT successful transactions).

export function ref(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function logAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  data: {
    actorId?: string;
    actorRole?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: unknown;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: data.actorId,
      actorRole: data.actorRole ?? "SYSTEM",
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details === undefined ? undefined : JSON.stringify(data.details),
    },
  });
}
