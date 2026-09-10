import useSWR from "swr";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  Bell,
  HandCoins,
  PiggyBank,
  UserRound,
  Landmark,
  CalendarDays,
} from "lucide-react";
import { greeting, formatKES, formatDate } from "@/utils/format";
import { api } from "@/lib/client/api";
import BottomNav from "@/components/layout/BottomNav";
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

  const tiles: { label: string; value: string; sub?: string; icon: ReactNode; tone: string; onClick?: () => void }[] = [
    {
      label: "Savings Balance",
      value: formatKES(data.savingsBalance),
      icon: <PiggyBank size={15} className="text-brand" />,
      tone: "bg-brand-soft",
      onClick: () => router.push("/savings"),
    },
    {
      label: "Outstanding Loan",
      value: formatKES(outstanding),
      icon: <UserRound size={15} className="text-orange-500" />,
      tone: "bg-orange-100",
      onClick: () => router.push(data.activeLoan ? `/loans/${data.activeLoan.id}` : "/loans"),
    },
    {
      label: "Loan Limit",
      value: formatKES(data.loanLimit),
      icon: <Landmark size={15} className="text-violet-500" />,
      tone: "bg-violet-100",
      onClick: () => router.push("/loans"),
    },
    {
      label: "Next Repayment",
      value: data.nextRepayment ? formatKES(data.nextRepayment.amount) : formatKES(0),
      sub: data.nextRepayment ? `Due ${formatDate(data.nextRepayment.dueDate)}` : "Nothing due",
      icon: <CalendarDays size={15} className="text-sky-500" />,
      tone: "bg-sky-100",
      onClick: () =>
        router.push(data.nextRepayment ? `/loans/${data.nextRepayment.loanId}` : "/loans"),
    },
  ];

  return (
    <div className="min-h-screen bg-surface pb-6">
      {/* Dark green hero */}
      <div className="relative overflow-hidden rounded-b-[36px] bg-brand-dark px-5 pb-24 pt-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-bright/10 blur-2xl" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-start justify-between"
        >
          <div>
            <p className="text-sm font-medium text-white/75">{greeting()},</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">
              {firstName} <span className="align-middle">👋</span>
            </h1>
          </div>
          <button
            onClick={() => router.push("/notifications")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {data.unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-bright px-1 text-[10px] font-bold text-brand-deep">
                {data.unreadNotifications}
              </span>
            )}
          </button>
        </motion.div>
      </div>

      <div className="relative -mt-16 space-y-4 px-5">
        {/* Available Loan card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl bg-white p-5 shadow-float"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
              <HandCoins size={21} className="text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Available Loan</p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
                {formatKES(available)}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/loans")}
            className="mt-4 w-full rounded-2xl bg-brand py-3 text-sm font-bold text-white shadow-brand transition hover:bg-brand-mid active:scale-[0.98]"
          >
            Apply Now
          </button>
        </motion.div>

        {/* 2x2 stat tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t, i) => (
            <motion.button
              key={t.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={t.onClick}
              className="rounded-3xl bg-white p-4 text-left shadow-card transition hover:shadow-float"
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.tone}`}>
                  {t.icon}
                </span>
                <p className="text-[11px] font-semibold leading-tight text-gray-500">{t.label}</p>
              </div>
              <p className="mt-2.5 text-lg font-extrabold tracking-tight text-ink">{t.value}</p>
              {t.sub && <p className="mt-0.5 text-[11px] text-gray-400">{t.sub}</p>}
            </motion.button>
          ))}
        </div>

        {/* Need more funds banner */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          onClick={() => router.push("/loans")}
          className="relative flex w-full items-center overflow-hidden rounded-3xl bg-brand-dark p-5 text-left shadow-brand"
        >
          <div className="max-w-[68%]">
            <p className="text-base font-extrabold text-white">Need more funds?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/80">
              Get a loan in minutes via M-Pesa
            </p>
          </div>
          {/* Phone illustration */}
          <div className="absolute -bottom-1 right-4 rotate-[-8deg]">
            <div className="flex h-[74px] w-[46px] items-center justify-center rounded-[12px] border-[3px] border-white/90 bg-white shadow-float">
              <div className="flex h-[56px] w-[34px] items-center justify-center rounded-[6px] bg-brand-gradient">
                <span className="text-[7px] font-extrabold tracking-wide text-white">M-PESA</span>
              </div>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
