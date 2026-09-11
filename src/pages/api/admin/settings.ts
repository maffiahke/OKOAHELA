import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi, ok, requireAdmin, ApiError } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";

const putSchema = z.object({
  minSavingsDeposit: z.number().int().min(1).max(1_000_000).optional(),
  maxSavingsDeposit: z.number().int().min(10).max(10_000_000).optional(),
  minSavingsWithdrawal: z.number().int().min(1).max(1_000_000).optional(),
  maxSavingsWithdrawal: z.number().int().min(10).max(10_000_000).optional(),
  withdrawalsEnabled: z.boolean().optional(),
  supportPhone: z.string().trim().min(3).max(20).optional(),
  supportWhatsapp: z.string().trim().min(3).max(20).optional(),
  supportEmail: z.string().trim().email("Enter a valid email").max(80).optional(),
  supportHours: z.string().trim().min(3).max(80).optional(),
});

// GET /api/admin/settings — current app settings.
// PUT /api/admin/settings — update app settings (partial).
export default withApi(async (req, res) => {
  const admin = await requireAdmin(req);

  if (req.method === "GET") {
    return ok(res, await getSettings());
  }

  if (req.method === "PUT") {
    const body = putSchema.parse(req.body);
    const current = await getSettings();
    const merged = { ...current, ...body };
    if (merged.minSavingsDeposit > merged.maxSavingsDeposit) {
      throw new ApiError(422, "Minimum deposit cannot exceed maximum deposit");
    }
    if (merged.minSavingsWithdrawal > merged.maxSavingsWithdrawal) {
      throw new ApiError(422, "Minimum withdrawal cannot exceed maximum withdrawal");
    }
    const settings = await saveSettings(body);
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: "ADMIN",
        action: "SETTINGS_UPDATED",
        entityType: "SystemSetting",
        entityId: "app",
        details: JSON.stringify(body),
      },
    });
    return ok(res, settings);
  }

  res.setHeader("Allow", "GET, PUT");
  return ok(res, null, 405);
});
