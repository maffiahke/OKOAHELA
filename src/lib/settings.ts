import { prisma } from "@/lib/db";

// App-wide admin-configurable settings, persisted as one JSON blob in the
// SystemSetting table under the "app" key.
export interface AppSettings {
  minSavingsDeposit: number;
  maxSavingsDeposit: number;
  minSavingsWithdrawal: number;
  maxSavingsWithdrawal: number;
  withdrawalsEnabled: boolean;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  supportHours: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  minSavingsDeposit: 2,
  maxSavingsDeposit: 300000,
  minSavingsWithdrawal: 50,
  maxSavingsWithdrawal: 300000,
  withdrawalsEnabled: true,
  supportPhone: "+254700123456",
  supportWhatsapp: "254700123456",
  supportEmail: "support@okohela.co.ke",
  supportHours: "Mon–Sat, 8am–7pm EAT",
};

const CACHE_MS = 15_000;
let cache: { value: AppSettings; at: number } | null = null;

export async function getSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  let value = { ...DEFAULT_SETTINGS };
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "app" } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      value = { ...DEFAULT_SETTINGS, ...sanitize(parsed) };
    }
  } catch (err) {
    console.error("[settings] failed to load, using defaults:", err);
  }
  cache = { value, at: Date.now() };
  return value;
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...sanitize(partial) };
  const json = JSON.stringify(next);
  await prisma.systemSetting.upsert({
    where: { key: "app" },
    create: { key: "app", value: json },
    update: { value: json },
  });
  cache = { value: next, at: Date.now() };
  return next;
}

// Coerce to known keys with sane types so a bad blob can't break the app.
function sanitize(input: unknown): AppSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  const num = (key: keyof AppSettings, min: number, max: number) => {
    const v = Number(src[key]);
    if (Number.isFinite(v)) out[key] = Math.min(max, Math.max(min, Math.round(v))) as never;
  };
  num("minSavingsDeposit", 1, 1_000_000);
  num("maxSavingsDeposit", 10, 10_000_000);
  num("minSavingsWithdrawal", 1, 1_000_000);
  num("maxSavingsWithdrawal", 10, 10_000_000);
  if (typeof src.withdrawalsEnabled === "boolean") out.withdrawalsEnabled = src.withdrawalsEnabled;
  const str = (key: keyof AppSettings, maxLen: number) => {
    const v = src[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, maxLen) as never;
  };
  str("supportPhone", 20);
  str("supportWhatsapp", 20);
  str("supportEmail", 80);
  str("supportHours", 80);
  return out;
}
