import { useRouter } from "next/router";
import useSWR from "swr";
import { useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Sheet from "@/components/ui/Sheet";
import MpesaStkModal from "@/components/mpesa/MpesaStkModal";
import { api, ApiClientError } from "@/lib/client/api";
import { formatKES, formatDate } from "@/utils/format";

interface ScheduleRow {
  id: string;
  installment: number;
  amount: number;
  dueDate: string;
  status: string;
}
interface LoanDetail {
  id: string;
  reference: string;
  principal: number;
  fee: number;
  totalRepayment: number;
  amountPaid: number;
  remaining: number;
  monthlyRepayment: number;
  periodMonths: number;
  status: string;
  disbursedAt: string | null;
  dueDate: string | null;
  schedule: ScheduleRow[];
  repayments: { id: string; reference: string; amount: number; createdAt: string }[];
}

export default function LoanDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { data, mutate } = useSWR<LoanDetail>(id ? `/api/loans/${id}` : null);

  const [paySheet, setPaySheet] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [stkOpen, setStkOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | null>(null);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const progress = data.totalRepayment > 0 ? Math.min(100, Math.round((data.amountPaid / data.totalRepayment) * 100)) : 0;
  const repayable = data.status !== "FULLY_REPAID";

  const startRepayment = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ checkoutRequestId: string }>("/api/loans/repay", { loanId: data.id, amount: amt });
      setPaySheet(false);
      setPayAmount(amt);
      setCheckoutRequestId(res.checkoutRequestId);
      setStkOpen(true);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not start repayment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-card">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-extrabold text-ink">Loan {data.reference}</h1>
        <span className="ml-auto"><Badge status={data.status} /></span>
      </div>

      {/* Summary */}
      <div className="rounded-[28px] bg-brand-gradient p-6 text-white shadow-brand">
        <p className="text-sm font-semibold opacity-85">Outstanding Balance</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatKES(data.remaining)}</p>
        <div className="mt-4 h-2.5 rounded-full bg-white/25">
          <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold opacity-85">
          <span>Paid {formatKES(data.amountPaid)}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 px-2 py-2.5 backdrop-blur">
            <p className="text-[10px] font-bold opacity-80">PRINCIPAL</p>
            <p className="text-sm font-extrabold">{formatKES(data.principal)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-2 py-2.5 backdrop-blur">
            <p className="text-[10px] font-bold opacity-80">MONTHLY</p>
            <p className="text-sm font-extrabold">{formatKES(data.monthlyRepayment)}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-2 py-2.5 backdrop-blur">
            <p className="text-[10px] font-bold opacity-80">DUE</p>
            <p className="text-sm font-extrabold">{data.dueDate ? formatDate(data.dueDate) : "—"}</p>
          </div>
        </div>
      </div>

      {repayable && (
        <Button fullWidth size="lg" onClick={() => { setAmount(String(data.monthlyRepayment)); setError(null); setPaySheet(true); }}>
          Repay Now
        </Button>
      )}

      {/* Schedule */}
      <Card>
        <h2 className="flex items-center gap-2 font-extrabold text-ink"><CalendarDays size={16} className="text-brand" /> Repayment schedule</h2>
        <ul className="mt-3 space-y-2">
          {data.schedule.map((s) => {
            const paid = s.status === "PAID";
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                {paid ? <CheckCircle2 size={20} className="text-brand" /> : <Circle size={20} className="text-gray-300" />}
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Installment {s.installment} · {formatKES(s.amount)}</p>
                  <p className="text-xs text-gray-400">Due {formatDate(s.dueDate)}{s.status === "PAID" ? " · paid" : ""}</p>
                </div>
                {paid && <Badge status="PAID" />}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Repayment history */}
      {data.repayments.length > 0 && (
        <Card padded={false}>
          <h2 className="px-5 pt-5 font-extrabold text-ink">Repayments</h2>
          <ul className="divide-y divide-gray-50 px-5 pb-2">
            {data.repayments.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-bold text-ink">{formatKES(r.amount)}</p>
                  <p className="text-xs text-gray-400">{r.reference}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Repay sheet */}
      <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Repay loan">
        <div className="rounded-2xl bg-surface px-4 py-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Remaining balance</span><span className="font-extrabold text-ink">{formatKES(data.remaining)}</span></div>
        </div>
        <label className="mt-4 block text-xs font-bold text-gray-500">AMOUNT (KES)</label>
        <Input
          inputMode="numeric"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="mt-1.5"
        />
        <div className="mt-2 flex gap-2">
          {[data.monthlyRepayment, data.remaining].map((v, i) => (
            <button key={i} onClick={() => setAmount(String(v))} className="flex-1 rounded-xl border-2 border-gray-100 py-2 text-xs font-bold text-brand hover:border-brand/30">
              {i === 0 ? "Monthly" : "Full balance"} · {formatKES(v)}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500">{error}</p>}
        <Button fullWidth size="lg" className="mt-4" loading={busy} onClick={startRepayment}>
          <Clock size={16} /> Pay via M-Pesa
        </Button>
      </Sheet>

      <MpesaStkModal
        open={stkOpen}
        onClose={() => {
          setStkOpen(false);
          mutate();
        }}
        amount={payAmount}
        label="loan repayment"
        onDone={() => mutate()}
        checkoutRequestId={checkoutRequestId}
      />
    </div>
  );
}
