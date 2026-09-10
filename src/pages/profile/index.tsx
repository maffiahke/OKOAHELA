import useSWR from "swr";
import { useRouter } from "next/router";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  CreditCard,
  History,
  Landmark,
  LifeBuoy,
  LogOut,
  PiggyBank,
  Settings,
  UserCircle2,
  Wallet,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/client/api";
import { initials } from "@/utils/format";
import { formatPhoneDisplay } from "@/lib/validation/schemas";

interface MeData {
  user: { id: string; phone: string; role: string; profile: { fullName: string; nationalId: string; kycStatus: string } | null };
  loanLimit: number;
  savingsBalance: number;
}

export default function Profile() {
  const router = useRouter();
  const { data } = useSWR<MeData>("/api/dashboard");

  const logout = async () => {
    try {
      await api.del("/api/auth/logout");
    } finally {
      window.location.href = "/login";
    }
  };

  const name = data?.user?.profile?.fullName ?? "Customer";

  const menu = [
    { icon: UserCircle2, label: "Personal Information", path: null },
    { icon: Wallet, label: "M-Pesa Details", path: null },
    { icon: History, label: "Loan History", path: "/transactions?category=LOANS" },
    { icon: PiggyBank, label: "Savings History", path: "/transactions?category=SAVINGS" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: LifeBuoy, label: "Help & Support", path: "/support" },
    { icon: Settings, label: "Settings", path: null },
  ];

  return (
    <div className="space-y-4 px-5 pb-6 pt-5">
      <BackButton />

      {/* Identity header */}
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-2xl font-extrabold text-white shadow-brand">
          {data?.user?.profile?.fullName ? initials(data.user.profile.fullName) : <UserCircle2 size={34} />}
        </div>
        <p className="mt-3 text-xl font-extrabold tracking-tight text-ink">{name}</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-400">
          {data?.user?.phone ? formatPhoneDisplay(data.user.phone) : ""}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-extrabold text-brand-dark">
          <BadgeCheck size={13} className="text-brand" /> Verified
        </span>
      </div>

      {/* Menu */}
      <Card padded={false}>
        <ul className="divide-y divide-gray-50">
          {menu.map((m) => (
            <li key={m.label}>
              <button
                onClick={() => m.path && router.push(m.path)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-surface"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <m.icon size={17} className="text-brand" />
                </div>
                <p className="flex-1 text-sm font-bold text-ink">{m.label}</p>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
            <Landmark size={16} className="text-brand" />
          </div>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Loan Limit</p>
          <p className="text-base font-extrabold text-ink">
            {data ? `KES ${data.loanLimit.toLocaleString()}` : "—"}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
            <CreditCard size={16} className="text-brand" />
          </div>
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Savings</p>
          <p className="text-base font-extrabold text-ink">
            {data ? `KES ${data.savingsBalance.toLocaleString()}` : "—"}
          </p>
        </div>
      </div>

      <Button fullWidth variant="danger" size="lg" onClick={logout}>
        <LogOut size={17} /> Log out
      </Button>
    </div>
  );
}
