import useSWR from "swr";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  Eye,
  EyeOff,
  History,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Sheet from "@/components/ui/Sheet";
import MpesaStkModal from "@/components/mpesa/MpesaStkModal";
import BackButton from "@/components/ui/BackButton";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { formatKES, formatDateTime } from "@/utils/format";

interface SavingsData {
  balance: number;
  withdrawals: {
    id: string;
    reference: string;
    amount: number;
    mpesaNumber: string;
    status: string;
    createdAt: string;
  }[];
  transactions: {
    id: string;
    type: string;
    amount: number;
    balanceAfter?: number;
    description: string;
    status: string;
    createdAt: string;
  }[];
}

export default function Savings() {
  const { data, mutate } = useSWR<SavingsData>("/api/savings");
  const { show } = useToast();
  const [sheet, setSheet] = useState<null | "deposit" | "withdraw">(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [stkOpen, setStkOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [flowLabel, setFlowLabel] = useState("savings");
  const [hideBalance, setHideBalance] = useState(false);

  const balance = data?.balance ?? 0;

  // Month-by-month deposit totals (last 6 months) for the mini chart.
  const bars = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-KE", { month: "short" }), total: 0 };
    });
    for (const t of data?.transactions ?? []) {
      if (t.type !== "DEPOSIT") continue;
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.total += t.amount;
    }
    const max = Math.max(...months.map((m) => m.total), 1);
    return months.map((m) => ({ ...m, pct: Math.max(Math.round((m.total / max) * 100), 6) }));
  }, [data]);

  const stats = useMemo(() => {
    const txs = data?.transactions ?? [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const savedThisMonth = txs
      .filter((t) => t.type === "DEPOSIT" && new Date(t.createdAt) >= monthStart)
      .reduce((s, t) => s + t.amount, 0);
    const locked = (data?.withdrawals ?? [])
      .filter((w) => w.status === "PENDING" || w.status === "APPROVED")
      .reduce((s, w) => s + w.amount, 0);
    const deposits = txs.filter((t) => t.type === "DEPOSIT").length;
    return { savedThisMonth, locked, deposits };
  }, [data]);

  const QUICK = [100, 250, 500, 1000];

  const startFlow = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (sheet === "withdraw" && amt > balance) {
      setError("Amount exceeds your savings balance");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (sheet === "deposit") {
        const res = await api.post<{ checkoutRequestId: string }>("/api/savings/deposit", { amount: amt });
        setSheet(null);
        setPayAmount(amt);
        setFlowLabel("deposit");
        setCheckoutRequestId(res.checkoutRequestId);
        setStkOpen(true);
      } else {
        // Withdrawals are queued for manual admin approval before payout.
        await api.post("/api/savings/withdraw", { amount: amt });
        setSheet(null);
        setAmount("");
        show("Withdrawal requested — awaiting admin approval.", "success");
        mutate();
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not start the transaction");
    } finally {
      setBusy(false);
    }
  };

  const openSheet = (mode: "deposit" | "withdraw") => {
    setAmount("");
    setError(null);
    setSheet(mode);
  };

  return (
    <div className="pb-8">
      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-b-[36px] bg-brand-dark px-6 pb-8 pt-5 text-white shadow-float">
        {/* decorative glows */}
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-brand-bright/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-brand/25 blur-2xl" />
        <Wallet size={150} className="pointer-events-none absolute -right-7 -top-9 rotate-12 opacity-10" />

        <div className="relative flex items-center justify-between">
          <BackButton light />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
            <Sparkles size={12} className="text-brand-bright" /> Savings
          </span>
        </div>

        <p className="relative mt-5 text-[13px] font-bold uppercase tracking-[0.14em] text-brand-bright">
          Current Balance
        </p>
        <div className="relative mt-1 flex items-center gap-3">
          <p className="text-[38px] font-extrabold leading-tight tracking-tight">
            {hideBalance ? "••••••" : formatKES(balance)}
          </p>
          <button
            onClick={() => setHideBalance((v) => !v)}
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white/85 ring-1 ring-white/20 transition hover:bg-white/20 active:scale-95"
          >
            {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
        <p className="relative mt-0.5 text-xs font-semibold text-white/65">
          {hideBalance ? "Tap the eye to show your balance" : "Your money is safe and growing."}
        </p>

        {/* Quick action chips row */}
        <div className="relative mt-6 flex gap-3">
          <button
            onClick={() => openSheet("deposit")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-extrabold text-brand-dark shadow-card transition hover:bg-white/90 active:scale-[0.98]"
          >
            <ArrowDownToLine size={17} /> Deposit
          </button>
          <button
            onClick={() => openSheet("withdraw")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 py-3.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
          >
            <ArrowUpFromLine size={17} /> Withdraw
          </button>
        </div>
      </div>

      {/* Stat strip — overlaps the hero edge */}
      <div className="relative z-10 -mt-5 px-5">
        <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-3xl bg-white py-4 shadow-float">
          <div className="px-2 text-center">
            <p className="text-[15px] font-extrabold text-ink">{hideBalance ? "•••" : formatKES(stats.savedThisMonth)}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Saved this month</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-[15px] font-extrabold text-ink">{stats.deposits}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Deposits</p>
          </div>
          <div className="px-2 text-center">
            <p className={`text-[15px] font-extrabold ${stats.locked > 0 ? "text-amber-600" : "text-ink"}`}>
              {hideBalance ? "•••" : formatKES(stats.locked)}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">In processing</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        {/* 6-month saving trend */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">Saving trend</h2>
              <p className="mt-0.5 text-xs font-semibold text-gray-400">Deposits over the last 6 months</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft">
              <TrendingUp size={17} className="text-brand" />
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            {bars.map((b, i) => (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end justify-center rounded-xl bg-gray-50">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${b.pct}%` }}
                    transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 120, damping: 18 }}
                    className={`w-3.5 rounded-full ${i === bars.length - 1 ? "bg-brand-gradient" : "bg-brand/25"}`}
                  />
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${i === bars.length - 1 ? "text-brand" : "text-gray-400"}`}>
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Withdrawal requests awaiting admin approval */}
        {!!data?.withdrawals.length && (
          <div>
            <div className="flex items-center gap-2 px-1">
              <Clock3 size={16} className="text-amber-500" />
              <h2 className="text-base font-extrabold text-ink">Withdrawal Requests</h2>
            </div>
            <ul className="mt-3 space-y-2.5">
              {data.withdrawals.map((w) => (
                <li key={w.id}>
                  <Card className="flex items-center gap-3 !p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
                      <ArrowUpFromLine size={17} className="text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        Withdrawal to {w.mpesaNumber}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateTime(w.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-extrabold text-red-500">−{formatKES(w.amount)}</span>
                      <Badge status={w.status} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Encouragement card */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-soft p-5">
          <svg
            className="absolute -bottom-2 right-4 h-20 w-20 text-brand/60"
            viewBox="0 0 64 64"
            fill="none"
          >
            <path
              d="M32 58V34"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M32 38c0-10-8-16-16-16 0 10 8 16 16 16Zm0-8c0-10 8-16 16-16 0 10-8 16-16 16Z"
              fill="currentColor"
            />
          </svg>
          <p className="max-w-[220px] text-[15px] font-extrabold leading-snug text-brand-dark">
            Small steps today, big dreams tomorrow.
          </p>
          <p className="mt-1.5 text-xs font-semibold text-brand-dark/70">
            Keep saving to grow your loan limit.
          </p>
        </div>

        {/* Recent savings activity */}
        <div>
          <div className="flex items-center gap-2 px-1">
            <History size={16} className="text-gray-400" />
            <h2 className="text-base font-extrabold text-ink">Recent Activity</h2>
          </div>
          {!data ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200/60" />
              ))}
            </div>
          ) : data.transactions.length ? (
            <motion.ul layout className="mt-3 space-y-2.5">
              {data.transactions.map((t, i) => {
                const credit = t.type === "DEPOSIT";
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card className="flex items-center gap-3 !p-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          credit ? "bg-brand-soft" : "bg-red-50"
                        }`}
                      >
                        {credit ? (
                          <ArrowDownToLine size={17} className="text-brand" />
                        ) : (
                          <ArrowUpFromLine size={17} className="text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{t.description}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(t.createdAt)}
                          {t.balanceAfter != null && !hideBalance && (
                            <span className="font-semibold text-gray-500"> · Bal {formatKES(t.balanceAfter)}</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-extrabold ${credit ? "text-brand" : "text-red-500"}`}
                      >
                        {credit ? "+" : "−"}
                        {formatKES(t.amount)}
                      </span>
                    </Card>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : (
            <Card className="mt-3">
              <div className="flex flex-col items-center py-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
                  <ArrowDownToLine size={22} className="text-brand" />
                </span>
                <p className="mt-3 text-sm font-extrabold text-ink">No savings yet</p>
                <p className="mt-1 text-center text-xs font-semibold text-gray-400">
                  Make your first deposit and watch your money grow.
                </p>
                <Button size="sm" className="mt-4" onClick={() => openSheet("deposit")}>
                  Deposit now
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Amount sheet */}
      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "deposit" ? "Deposit to savings" : "Withdraw from savings"}
      >
        <div className="rounded-2xl bg-surface px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Available balance</span>
            <span className="font-extrabold text-ink">{formatKES(balance)}</span>
          </div>
        </div>
        <label className="mt-4 block text-xs font-bold text-gray-500">AMOUNT (KES)</label>
        <Input
          inputMode="numeric"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="mt-1.5"
        />
        {sheet === "deposit" && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={`rounded-xl border-2 py-2 text-xs font-bold transition ${
                  amount === String(q)
                    ? "border-brand bg-brand-soft text-brand-dark"
                    : "border-gray-100 text-brand hover:border-brand/30"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500">
            {error}
          </p>
        )}
        <Button fullWidth size="lg" className="mt-4" loading={busy} onClick={startFlow}>
          {sheet === "withdraw" ? "Request withdrawal" : "Continue to M-Pesa"}
        </Button>
      </Sheet>

      <MpesaStkModal
        open={stkOpen}
        onClose={() => {
          setStkOpen(false);
          setAmount("");
          mutate();
        }}
        amount={payAmount}
        label={flowLabel}
        onDone={() => mutate()}
        checkoutRequestId={checkoutRequestId}
      />
    </div>
  );
}
