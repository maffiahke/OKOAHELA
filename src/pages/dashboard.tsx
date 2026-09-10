import useSWR from "swr";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  Bell,
  Wallet,
  PiggyBank,
  TrendingUp,
  CalendarClock,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { greeting, formatKES, formatDate, initials } from "@/utils/format";
import { api } from "@/lib/client/api";
import BackButton from "@/components/ui/BackButton";
import type { ReactNode } from "react";

interface DashboardData {
  user: { id: string; fullName: string; phone: string; kycStatus: string };
  loanLimit: number;
  savingsBalance: number;
  activeLoan: {
    id: string;
    reference: string;
    principal: number;
    fee: number;
    totalRepayment: number;
    amountPaid: number;
    monthlyRepayment: number;
    periodMonths: number;
    status: string;
    dueDate: string;
  } | null;
  nextRepayment: { amount: number; dueDate: string; installment: number; status: string; loanId: string } | null;
  unreadNotifications: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { data, error } = useSWR<DashboardData>("/api/dashboard", api.get);
  const loading = !data && !error;

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand/25 border-t-brand" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">Could not load your dashboard.</div>
    );
  }

  const firstName = data.user.fullName.split(/\s+/)[0];
  const available = Math.max(0, data.loanLimit - (data.activeLoan?.principal ?? 0));
  const outstanding = data.activeLoan
    ? Math.max(0, data.activeLoan.totalRepayment - data.activeLoan.amountPaid)
    : 0;

  const tiles: { label: string; value: string; sub?: string; icon: ReactNode; onClick?: () => void }[] = [
    {
      label: "Savings Balance",
      value: formatKES(data.savingsBalance),
      icon: <PiggyBank size={20} className="text-brand" />,
      onClick: () => router.push("/savings"),
    },
    {
      label: "Outstanding Loan",
      value: formatKES(outstanding),
      sub: data.activeLoan ? data.activeLoan.reference : "No active loan",
      icon: <Wallet size={20} className="text-orange-500" />,
      onClick: () => router.push(data.activeLoan ? `/loans/${data.activeLoan.id}` : "/loans"),
    },
    {
      label: "Loan Limit",
      value: formatKES(data.loanLimit),
      sub: "Approved maximum",
      icon: <TrendingUp size={20} className="text-violet-500" />,
      onClick: () => router.push("/loans"),
    },
    {
      label: "Next Repayment",
      value: data.nextRepayment ? formatKES(data.nextRepayment.amount) : formatKES(0),
      sub: data.nextRepayment
        ? `Due ${formatDate(data.nextRepayment.dueDate)}`
        : "Nothing due",
      icon: <CalendarClock size={20} className="text-red-500" />,
      onClick: () =>
        router.push(data.nextRepayment ? `/loans/${data.nextRepayment.loanId}` : "/loans"),
    },
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <BackButton fallback="/" />
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-deep text-sm font-extrabold text-white">
            {initials(data.user.fullName)}
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight text-ink">
              {greeting()}, {firstName} 👋
            </p>
            <p className="text-xs text-gray-400">Welcome to your money home</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {data.unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {data.unreadNotifications}
            </span>
          )}
        </button>
      </motion.div>

      {/* Available Loan card */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onClick={() => router.push("/loans")}
        className="flex items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-card transition hover:shadow-float"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
          <Wallet size={26} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-400">Available Loan</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
            {formatKES(available)}
          </p>
        </div>
        <span className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-brand">
          Apply Now
        </span>
      </motion.button>

      {/* 2x2 stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <motion.button
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.04 }}
            onClick={t.onClick}
            className="flex flex-col items-start rounded-3xl bg-white p-4 text-left shadow-card transition hover:shadow-float"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
              {t.icon}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-gray-400">{t.label}</p>
            <p className="mt-0.5 text-lg font-extrabold tracking-tight text-ink">{t.value}</p>
            {t.sub && <p className="mt-0.5 text-[11px] text-gray-400">{t.sub}</p>}
          </motion.button>
        ))}
      </div>

      {/* Need more funds banner */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={() => router.push("/loans")}
        className="relative overflow-hidden rounded-3xl bg-brand-gradient p-5 text-left shadow-brand"
      >
        <div className="max-w-[70%]">
          <p className="text-base font-extrabold text-white">Need more funds?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/85">
            Get a loan in 5 minutes via M-Pesa
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-dark">
            Apply now <ArrowRight size={13} />
          </span>
        </div>
        <div className="absolute -right-2 bottom-0 flex h-24 w-24 items-center justify-center opacity-90">
          <div className="flex h-16 w-10 items-center justify-center rounded-xl border-2 border-white/70 bg-white/15 backdrop-blur">
            <Smartphone size={24} className="text-white" />
          </div>
        </div>
        <div className="absolute right-16 top-3 h-8 w-8 rounded-full bg-white/15" />
      </motion.button>
    </div>
  );
}
