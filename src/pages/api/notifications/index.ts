import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";

// GET /api/notifications — list, POST /api/notifications — mark all read,
// PATCH /api/notifications { id } — mark one read.
export default withApi(async (req, res) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
    const items = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok(res, {
      items,
      unread: items.filter((n) => !n.read).length,
    });
  }

  if (req.method === "POST") {
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return ok(res, { markedAll: true });
  }

  if (req.method === "PATCH") {
    const id = String((req.body as { id?: string })?.id ?? "");
    if (!id) throw new ApiError(400, "Missing notification id");
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    return ok(res, { marked: true });
  }

  throw new ApiError(405, "Method not allowed");
});
