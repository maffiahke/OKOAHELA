import useSWR from "swr";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Banknote,
  Check,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { formatKES } from "@/utils/format";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";

interface LoanProduct {
  id: string;
  name: string;
  amount: number;
  feeRate: number;
  periodMonths: number;
  description: string;
}

const KEY_INFO = [
  "Disbursed via M-Pesa",
  "Automatic repayment reminders",
  "Flexible repayment options",
];

export default function LoanDetails() {
  const router = useRouter();
  const { show } = useToast();
  const productId = String(router.query.productId ?? "");
  const { data: products, error } = useSWR<LoanProduct[]>(
    productId ? "/api/loan-products" : null,
    api.get,
  );
  const { data: me } = useSWR<{ id: string; phone: string } | null>("/api/auth/me", api.get);

  const product = useMemo(
    () => products?.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const [period, setPeriod] = useState<number | null>(null);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectivePeriod = period ?? product?.periodMonths ?? 1;
  const fee = product ? Math.round(product.amount * product.feeRate) : 0;
  const total = (product?.amount ?? 0) + fee;
  const monthly = Math.round(Math.floor((total / effectivePeriod) * 100) / 100);

  const submit = async () => {
    if (!product) return;
    setSubmitting(true);
    try {
      const app = await api.post<{
        id: string;
        status: string;
      }>("/api/loans/apply", {
        productId: product.id,
        periodMonths: effectivePeriod,
        mpesaNumber: me?.phone ?? "254700000000",
      });
      setConfirmOpen(false);
      router.push(
        `/loans/processing?applicationId=${app.id}&amount=${product.amount}&status=${app.status}`,
      );
    } catch (e) {
      show(e instanceof Error ? e.message : "Could not submit application", "error");
      setSubmitting(false);
    }
  };

  if (error || (products && !product)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-gray-500">Loan product not found.</p>
        <button
          onClick={() => router.push("/loans")}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
        >
          Back to products
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  const rows: { label: string; value: string; periodPicker?: boolean }[] = [
    { label: "Loan Amount", value: formatKES(product.amount) },
    { label: "Fee", value: formatKES(fee) },
    { label: "Total Repayment", value: formatKES(total) },
    { label: "Repayment Period", value: `${effectivePeriod} ${effectivePeriod === 1 ? "Month" : "Months"}`, periodPicker: true },
    { label: "Monthly Repayment", value: formatKES(monthly) },
  ];

  return (
    <div className="flex flex-col px-5 pb-6 pt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/loans")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-gray-50"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Loan Details</h1>
      </div>

      {/* Selected amount hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 flex flex-col items-center rounded-3xl bg-brand-gradient p-7 text-center shadow-brand"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <Banknote size={28} className="text-white" />
        </div>
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">
          {formatKES(product.amount)}
        </p>
        <span className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-dark">
          Selected Amount
        </span>
      </motion.div>

      {/* Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mt-5 rounded-3xl bg-white p-2 shadow-card"
      >
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.periodPicker ? () => setPeriodSheet(true) : undefined}
            className={`flex w-full items-center justify-between px-3 py-3.5 ${
              r.periodPicker ? "transition hover:bg-gray-50" : "cursor-default"
            }`}
          >
            <span className="text-sm font-medium text-gray-500">{r.label}</span>
            <span className="flex items-center gap-1 text-sm font-extrabold text-ink">
              {r.value}
              {r.periodPicker && <ChevronRight size={16} className="text-gray-300" />}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Key information */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-5"
      >
        <p className="text-sm font-extrabold text-brand">Key Information</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {KEY_INFO.map((k) => (
            <li key={k} className="flex items-center gap-2.5 text-[13px] font-medium text-gray-600">
              <CheckCircle2 size={17} className="shrink-0 text-brand" />
              {k}
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="flex-1" />

      <button
        onClick={() => {
          setAgree(false);
          setConfirmOpen(true);
        }}
        className="mt-6 rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
      >
        Continue
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
        By continuing, you agree to our <span className="font-semibold text-gray-500">Terms &amp; Conditions</span> and{" "}
        <span className="font-semibold text-gray-500">Privacy Policy</span>
      </p>

      {/* Repayment Period sheet (mockup #16) */}
      <Sheet open={periodSheet} onClose={() => setPeriodSheet(false)} title="Repayment Period">
        <div className="flex flex-col gap-2 pb-2">
          {[1, 2, 3, 4].map((m) => (
            <button
              key={m}
              onClick={() => setPeriod(m)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                effectivePeriod === m
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-bold text-ink">
                {m} {m === 1 ? "Month" : "Months"}
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  effectivePeriod === m ? "border-brand bg-brand" : "border-gray-300"
                }`}
              >
                {effectivePeriod === m && <Check size={12} className="text-white" />}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPeriodSheet(false)}
          className="mt-3 w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-brand"
        >
          Next
        </button>
      </Sheet>

      {/* Confirm Loan Application modal (mockup #14) */}
      <Sheet open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title="Confirm Loan Application">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Loan Amount", value: formatKES(product.amount) },
            { label: "Fee", value: formatKES(fee) },
            { label: "Total Repayment", value: formatKES(total) },
            {
              label: "Repayment Period",
              value: `${effectivePeriod} ${effectivePeriod === 1 ? "Month" : "Months"}`,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-gray-50 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400">{c.label}</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{c.value}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl bg-brand-soft p-3.5">
            <p className="text-[11px] font-semibold text-gray-400">Monthly Repayment</p>
            <p className="mt-1 text-sm font-extrabold text-brand-dark">{formatKES(monthly)}</p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-gray-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
          />
          <span>
            I agree to the <span className="font-semibold text-brand">Terms &amp; Conditions</span>{" "}
            and <span className="font-semibold text-brand">Privacy Policy</span>
          </span>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3 pb-2">
          <button
            onClick={submit}
            disabled={!agree || submitting}
            className="rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-brand transition hover:bg-mid disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-ink transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
