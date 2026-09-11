import { withApi, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";

// GET /api/settings — public subset: limits + support contact info.
export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return ok(res, null, 405);
  }
  const s = await getSettings();
  ok(res, {
    minSavingsDeposit: s.minSavingsDeposit,
    maxSavingsDeposit: s.maxSavingsDeposit,
    minSavingsWithdrawal: s.minSavingsWithdrawal,
    maxSavingsWithdrawal: s.maxSavingsWithdrawal,
    withdrawalsEnabled: s.withdrawalsEnabled,
    supportPhone: s.supportPhone,
    supportWhatsapp: s.supportWhatsapp,
    supportEmail: s.supportEmail,
    supportHours: s.supportHours,
  });
});
