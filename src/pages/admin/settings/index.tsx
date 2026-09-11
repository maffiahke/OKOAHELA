import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { Coins, Headphones, Loader2, Save, Undo2, Wallet } from "lucide-react";

interface SettingsData {
  minSavingsDeposit: number;
  maxSavingsDeposit: number;
  minSavingsWithdrawal: number;
  maxSavingsWithdrawal: number;
  withdrawalsEnabled: boolean;
  supportPhone: string;
  supportEmail: string;
  supportHours: string;
  supportWhatsapp: string;
}

const EMPTY: SettingsData = {
  minSavingsDeposit: 0,
  maxSavingsDeposit: 0,
  minSavingsWithdrawal: 0,
  maxSavingsWithdrawal: 0,
  withdrawalsEnabled: true,
  supportPhone: "",
  supportEmail: "",
  supportHours: "",
  supportWhatsapp: "",
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-gradient" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-8" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingsBody() {
  const { show } = useToast();
  const [data, setData] = useState<SettingsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<SettingsData>("/api/admin/settings")
      .then(setData)
      .catch((err) => show(err.message, "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.put<SettingsData>("/api/admin/settings", data);
      setData(saved);
      show("Settings saved", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted">
        <Loader2 size={18} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-[22px] font-extrabold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Limits and support info apply app-wide immediately after saving.
        </p>
      </div>

      {/* Savings deposits */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Coins size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-ink">Savings Deposits</h2>
            <p className="text-xs text-muted">Allowed amount per deposit (KES)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            name="minSavingsDeposit"
            label="Minimum deposit"
            type="number"
            min={1}
            value={data.minSavingsDeposit}
            onChange={(e) => set("minSavingsDeposit", Number(e.target.value))}
            suffix={<span className="text-xs font-semibold text-muted">KES</span>}
          />
          <Input
            name="maxSavingsDeposit"
            label="Maximum deposit"
            type="number"
            min={1}
            value={data.maxSavingsDeposit}
            onChange={(e) => set("maxSavingsDeposit", Number(e.target.value))}
            suffix={<span className="text-xs font-semibold text-muted">KES</span>}
          />
        </div>
      </Card>

      {/* Withdrawals */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <Wallet size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-ink">Withdrawals</h2>
            <p className="text-xs text-muted">Savings withdrawal rules</p>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
          <div>
            <p className="text-sm font-bold text-ink">
              {data.withdrawalsEnabled ? "Withdrawals enabled" : "Withdrawals disabled"}
            </p>
            <p className="text-xs text-muted">
              {data.withdrawalsEnabled
                ? "Customers can request M-Pesa withdrawals"
                : "Customers cannot withdraw savings until re-enabled"}
            </p>
          </div>
          <Toggle checked={data.withdrawalsEnabled} onChange={(v) => set("withdrawalsEnabled", v)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            name="minSavingsWithdrawal"
            label="Minimum withdrawal"
            type="number"
            min={1}
            value={data.minSavingsWithdrawal}
            onChange={(e) => set("minSavingsWithdrawal", Number(e.target.value))}
            suffix={<span className="text-xs font-semibold text-muted">KES</span>}
          />
          <Input
            name="maxSavingsWithdrawal"
            label="Maximum withdrawal"
            type="number"
            min={1}
            value={data.maxSavingsWithdrawal}
            onChange={(e) => set("maxSavingsWithdrawal", Number(e.target.value))}
            suffix={<span className="text-xs font-semibold text-muted">KES</span>}
          />
        </div>
        {!data.withdrawalsEnabled && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
            <Undo2 size={14} className="shrink-0" />
            New withdrawal requests are being rejected while this is off.
          </div>
        )}
      </Card>

      {/* Support */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Headphones size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-ink">Customer Support</h2>
            <p className="text-xs text-muted">Shown on the Help &amp; Support page</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              name="supportPhone"
              label="Support phone"
              value={data.supportPhone}
              onChange={(e) => set("supportPhone", e.target.value)}
              hint="Format: +2547XXXXXXXX"
            />
            <Input
              name="supportWhatsapp"
              label="WhatsApp number"
              value={data.supportWhatsapp}
              onChange={(e) => set("supportWhatsapp", e.target.value)}
              hint="Digits with country code, e.g. 2547XXXXXXXX"
            />
          </div>
          <Input
            name="supportEmail"
            label="Support email"
            type="email"
            value={data.supportEmail}
            onChange={(e) => set("supportEmail", e.target.value)}
          />
          <Input
            name="supportHours"
            label="Working hours"
            value={data.supportHours}
            onChange={(e) => set("supportHours", e.target.value)}
            placeholder="e.g. Mon–Fri, 9am–5pm EAT"
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          <span className="flex items-center gap-2">
            <Save size={16} /> Save changes
          </span>
        </Button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <SettingsBody />
    </AdminLayout>
  );
}
