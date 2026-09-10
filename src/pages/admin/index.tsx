import useSWR from "swr";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, ClipboardList, PiggyBank, Users, Wallet, AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import BackButton from "@/components/ui/BackButton";
import { formatKES, relativeTime } from "@/utils/format";

interface Metrics {
  customers: number;
  pendingApplications: number;
  activeLoans: number;
  overdueLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalSavings: number;
  recentTransactions: {
    id: string;
    reference: string;
    description: string;
    direction: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

export default function AdminOverview() {
  const router = useRouter();
  const { data } = useSWR<Metrics>("/api/admin/metrics", { refreshInterval: 20000 });

  const kpis = [
    { label: "Customers", value: data ? String(data.customers) : "—", Icon: Users, tone: "bg-blue-50 text-blue-600" },
    { label: "Pending applications", value: data ? String(data.pendingApplications) : "—", Icon: ClipboardList, tone: "bg-amber-50 text-amber-600", path: "/admin/applications" },
    { label: "Active loans", value: data ? String(data.activeLoans) : "—", Icon: Wallet, tone: "bg-brand-soft text-brand", path: "/admin/loans" },
    { label: "Overdue loans", value: data ? String(data.overdueLoans) : "—", Icon: AlertTriangle, tone: "bg-red-50 text-red-500", path: "/admin/loans" },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Admin Overview</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">Portfolio health at a glance</p>

      {/* Money KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-3xl bg-brand-gradient p-5 text-white shadow-brand">
            <BadgeDollarSign size={22} className="opacity-90" />
            <p className="mt-3 text-xs font-bold opacity-85">TOTAL DISBURSED</p>
            <p className="text-2xl font-extrabold tracking-tight">{formatKES(data?.totalDisbursed ?? 0)}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="h-full">
            <ArrowDownLeft size={22} className="text-brand" />
            <p className="mt-3 text-xs font-bold text-gray-400">TOTAL REPAID</p>
            <p className="text-2xl font-extrabold text-ink">{formatKES(data?.totalRepaid ?? 0)}</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="h-full">
            <PiggyBank size={22} className="text-brand" />
            <p className="mt-3 text-xs font-bold text-gray-400">TOTAL SAVINGS</p>
            <p className="text-2xl font-extrabold text-ink">{formatKES(data?.totalSavings ?? 0)}</p>
          </Card>
        </motion.div>
      </div>

      {/* Count KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className={`transition hover:shadow-float ${k.path ? "cursor-pointer" : ""}`}
            onClick={() => k.path && router.push(k.path)}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${k.tone}`}>
              <k.Icon size={17} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-ink">{k.value}</p>
            <p className="text-xs font-bold text-gray-400">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card padded={false}>
        <h2 className="px-5 pt-5 font-extrabold text-ink">Recent activity</h2>
        {!data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : data.recentTransactions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No activity yet</p>
        ) : (
          <ul className="divide-y divide-gray-50 px-5 pb-2">
            {data.recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.direction === "CREDIT" ? "bg-brand-soft" : "bg-gray-100"}`}>
                  {t.direction === "CREDIT" ? <ArrowDownLeft size={15} className="text-brand" /> : <ArrowUpRight size={15} className="text-gray-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{t.description}</p>
                  <p className="text-xs text-gray-400">{t.reference} · {relativeTime(t.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-extrabold ${t.direction === "CREDIT" ? "text-brand" : "text-ink"}`}>
                    {t.direction === "CREDIT" ? "+" : "−"}{formatKES(t.amount)}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400">{t.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
