import { FormEvent, useEffect, useState } from "react";
import { mutate } from "swr";
import useSWR from "swr";
import { IdCard, User, CalendarDays } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { nameSchema, nationalIdSchema, dobSchema } from "@/lib/validation/schemas";

interface ProfileData {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  kycStatus: string;
}

export default function PersonalInfo() {
  const { show } = useToast();
  const { data, isLoading } = useSWR<ProfileData>("/api/profile");
  const [form, setForm] = useState({ fullName: "", nationalId: "", dateOfBirth: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ fullName: data.fullName, nationalId: data.nationalId, dateOfBirth: data.dateOfBirth });
    }
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const nameResult = nameSchema.safeParse(form.fullName);
    if (!nameResult.success) errs.fullName = nameResult.error.issues[0]?.message ?? "Invalid name";
    const idResult = nationalIdSchema.safeParse(form.nationalId);
    if (!idResult.success) errs.nationalId = idResult.error.issues[0]?.message ?? "Invalid ID";
    const dobResult = dobSchema.safeParse(form.dateOfBirth);
    if (!dobResult.success) errs.dateOfBirth = dobResult.error.issues[0]?.message ?? "Invalid date";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await api.patch("/api/profile", {
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        dateOfBirth: form.dateOfBirth,
      });
      await mutate("/api/profile");
      await mutate("/api/dashboard");
      show("Personal information updated", "success");
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
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Personal Information</h1>
        <p className="mt-0.5 text-sm text-gray-500">Keep your details up to date so we can serve you better.</p>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <Input
              label="Full name"
              icon={User}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              error={errors.fullName}
            />
            <Input
              label="National ID / Passport No."
              icon={IdCard}
              inputMode="numeric"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              error={errors.nationalId}
            />
            <Input
              label="Date of birth"
              icon={CalendarDays}
              type="date"
              value={form.dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              error={errors.dateOfBirth}
            />
            <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs font-semibold text-gray-500">KYC status</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  data?.kycStatus === "VERIFIED" ? "bg-brand-soft text-brand-dark" : "bg-amber-100 text-amber-700"
                }`}
              >
                {data?.kycStatus === "VERIFIED" ? "Verified" : "Pending verification"}
              </span>
            </div>
            <Button type="submit" fullWidth size="lg" loading={saving}>
              Save changes
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
