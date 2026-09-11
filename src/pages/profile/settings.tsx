import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Bell,
  ChevronRight,
  LifeBuoy,
  Lock,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import { passwordSchema, formatPhoneDisplay } from "@/lib/validation/schemas";

interface ProfileData {
  phone: string;
  role: string;
  memberSince: string;
}

export default function Settings() {
  const router = useRouter();
  const { show } = useToast();
  const { data } = useSWR<ProfileData>("/api/profile");
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.currentPassword) errs.currentPassword = "Enter your current password";
    const parsed = passwordSchema.safeParse(form.newPassword);
    if (!parsed.success) errs.newPassword = parsed.error.issues[0]?.message ?? "Invalid password";
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await api.post("/api/profile/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      show("Password changed", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not change password", "error");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await api.del("/api/auth/logout");
    } finally {
      window.location.href = "/login";
    }
  };

  const passwordField = (name: "currentPassword" | "newPassword" | "confirmPassword", label: string) => (
    <Input
      label={label}
      icon={Lock}
      type={reveal[name] ? "text" : "password"}
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      error={errors[name]}
      suffix={
        <button
          type="button"
          onClick={() => setReveal((r) => ({ ...r, [name]: !r[name] }))}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50"
        >
          {reveal[name] ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  );

  return (
    <div className="space-y-4 px-5 pb-6 pt-5">
      <BackButton />
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your security and preferences.</p>
      </div>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">Change password</h2>
        <form onSubmit={changePassword} className="mt-3 space-y-4">
          {passwordField("currentPassword", "Current password")}
          {passwordField("newPassword", "New password")}
          {passwordField("confirmPassword", "Confirm new password")}
          <Button type="submit" fullWidth size="lg" loading={saving}>
            Update password
          </Button>
        </form>
      </Card>

      <Card padded={false}>
        <ul className="divide-y divide-gray-50">
          {[
            { icon: Bell, label: "Notifications", path: "/notifications" },
            { icon: LifeBuoy, label: "Help & Support", path: "/support" },
          ].map((m) => (
            <li key={m.label}>
              <Link
                href={m.path}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <m.icon size={17} className="text-brand" />
                </div>
                <p className="flex-1 text-sm font-bold text-ink">{m.label}</p>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">Account</h2>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="font-semibold text-gray-400">Phone</dt>
            <dd className="font-extrabold text-ink">{data ? formatPhoneDisplay(data.phone) : "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-semibold text-gray-400">Role</dt>
            <dd className="font-extrabold uppercase text-ink">{data?.role ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="font-semibold text-gray-400">Member since</dt>
            <dd className="font-extrabold text-ink">
              {data ? new Date(data.memberSince).toLocaleDateString("en-KE", { month: "short", year: "numeric" }) : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Button fullWidth variant="danger" size="lg" onClick={logout}>
        <LogOut size={17} /> Log out
      </Button>
    </div>
  );
}
