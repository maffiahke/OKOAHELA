import useSWR from "swr";
import { useState } from "react";
import { motion } from "framer-motion";
import { Banknote, BellOff, CheckCheck, PiggyBank, Wallet } from "lucide-react";
import Card from "@/components/ui/Card";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/client/api";
import { relativeTime } from "@/utils/format";

interface Notif {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Banknote> = {
  LOAN_APPROVED: Wallet,
  LOAN_DISBURSED: Banknote,
  LOAN_REPAYMENT: Wallet,
  LOAN_REMINDER: Wallet,
  SAVINGS: PiggyBank,
};

export default function Notifications() {
  const { data, mutate } = useSWR<{ items: Notif[]; unread: number }>("/api/notifications");
  const [busy, setBusy] = useState(false);

  const markAll = async () => {
    setBusy(true);
    try {
      await api.post("/api/notifications");
      mutate();
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id: string) => {
    await api.patch("/api/notifications", { id });
    mutate();
  };

  const unread = data?.unread ?? 0;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <BackButton />
        <h1 className="flex-1 px-1 text-lg font-extrabold text-ink">Notifications</h1>
        {unread > 0 && (
          <button onClick={markAll} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-card disabled:opacity-50">
            <CheckCheck size={13} /> Mark all read ({unread})
          </button>
        )}
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200/60" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-10">
            <BellOff size={36} className="text-gray-300" />
            <p className="mt-3 text-sm font-bold text-ink">You're all caught up</p>
            <p className="mt-1 text-xs text-gray-400">Loan and savings updates will appear here.</p>
          </div>
        </Card>
      ) : (
        <motion.ul layout className="space-y-2.5">
          {data.items.map((n, i) => {
            const Icon = TYPE_ICON[n.type] ?? Wallet;
            return (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => !n.read && markOne(n.id)}
                className={`cursor-pointer rounded-3xl bg-white p-4 shadow-card transition ${!n.read ? "border-l-4 border-brand" : "opacity-80"}`}
              >
                <div className="flex gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${n.read ? "bg-gray-100" : "bg-brand-soft"}`}>
                    <Icon size={17} className={n.read ? "text-gray-400" : "text-brand"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? "font-semibold text-gray-500" : "font-extrabold text-ink"}`}>{n.title}</p>
                      <span className="shrink-0 text-[11px] text-gray-400">{relativeTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{n.message}</p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
