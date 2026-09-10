import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin } from "@/lib/api";

// GET /api/admin/audit — audit trail (newest first).
export default withApi(async (req, res) => {
  await requireAdmin(req);
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  ok(res, logs);
});
