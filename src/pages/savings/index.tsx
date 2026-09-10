import useSWR from "swr";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, PiggyBank } from "lucide-react";
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

  const balance = data?.balance ?? 0;

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
    <div className="pb-6">
      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-b-[32px] bg-brand-gradient px-6 pb-7 pt-6 text-white shadow-brand">
        <PiggyBank size={130} className="absolute -right-6 -top-8 opacity-15" />
        <BackButton light className="absolute left-4 top-4 z-10" />
        <p className="text-sm font-semibold text-white/85">Current Balance</p>
        <p className="mt-1.5 text-4xl font-extrabold tracking-tight">{formatKES(balance)}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => openSheet("deposit")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-extrabold text-brand-dark shadow-card transition hover:bg-white/90 active:scale-[0.98]"
          >
            <ArrowDownToLine size={17} /> Deposit Money
          </button>
          <button
            onClick={() => openSheet("withdraw")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 py-3.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
          >
            <ArrowUpFromLine size={17} /> Withdraw
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        {/* Withdrawal requests awaiting admin approval */}
        {!!data?.withdrawals.length && (
          <div>
            <h2 className="px-1 text-base font-extrabold text-ink">Withdrawal Requests</h2>
            <ul className="mt-3 space-y-2.5">
              {data.withdrawals.map((w) => (
                <li key={w.id}>
                  <Card className="flex items-center gap-3 !p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                      <ArrowUpFromLine size={17} className="text-red-500" />
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

        {/* Recent savings */}
        <div>
          <h2 className="px-1 text-base font-extrabold text-ink">Recent Savings</h2>
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
                        <p className="text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
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
              <p className="py-8 text-center text-sm text-gray-400">
                No savings activity yet — make your first deposit!
              </p>
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
                className="rounded-xl border-2 border-gray-100 py-2 text-xs font-bold text-brand hover:border-brand/30"
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
