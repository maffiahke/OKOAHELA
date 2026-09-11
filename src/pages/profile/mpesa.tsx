import { FormEvent, useEffect, useState } from "react";
import { mutate } from "swr";
import useSWR from "swr";
import { ShieldCheck, Smartphone } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { phoneSchema, formatPhoneDisplay } from "@/lib/validation/schemas";

interface ProfileData {
  mpesaNumber: string;
  phone: string;
}

export default function MpesaDetails() {
  const { show } = useToast();
  const { data, isLoading } = useSWR<ProfileData>("/api/profile");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setMpesaNumber(data.mpesaNumber);
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(mpesaNumber);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid number");
      return;
    }
    setError(null);

    setSaving(true);
    try {
      await api.patch("/api/profile", { mpesaNumber: parsed.data });
      await mutate("/api/profile");
      show("M-Pesa number updated", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-5 pb-6 pt-5">
      <BackButton />
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">M-Pesa Details</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          This number receives your loan disbursements and is used for STK payments.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Account phone</p>
                <p className="mt-0.5 text-sm font-extrabold text-ink">
                  {data ? formatPhoneDisplay(data.phone) : "—"}
                </p>
              </div>
              <ShieldCheck size={18} className="text-brand" />
            </div>
            <Input
              label="M-Pesa number"
              icon={Smartphone}
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={mpesaNumber}
              onChange={(e) => setMpesaNumber(e.target.value)}
              error={error}
              hint="Safaricom number in 07XX XXX XXX or 2547XXXXXXXX format"
            />
            <Button type="submit" fullWidth size="lg" loading={saving}>
              Save changes
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
