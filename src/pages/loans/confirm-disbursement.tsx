import { useRouter } from "next/router";
import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Smartphone, Check } from "lucide-react";
import MpesaStkModal from "@/components/mpesa/MpesaStkModal";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/client/api";
import { formatKES } from "@/utils/format";

const CONFETTI = Array.from({ length: 24 }).map((_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 6) * 0.12,
  color: ["#1B8B00", "#2ECC40", "#FFC107", "#27AE60"][i % 4],
  size: 8 + (i % 3) * 4,
}));

interface LoanDetail {
  id: string;
  reference: string;
  principal: number;
  fee: number;
  totalRepayment: number;
  monthlyRepayment: number;
  periodMonths: number;
  status: string;
}

export default function ConfirmDisbursement() {
  const router = useRouter();
  const { applicationId } = router.query as { applicationId?: string };
  const { data: app } = useSWR<{ status: string; loanId: string | null }>(
    applicationId ? `/api/loans/status/${applicationId}` : null,
  );

  const loanId = app?.loanId ?? null;
  const approved = app?.status === "APPROVED" || app?.status === "DISBURSED";
  const { data: loan } = useSWR<LoanDetail>(loanId ? `/api/loans/${loanId}` : null);

  const [stkOpen, setStkOpen] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auto = useRef(false);

  // If already disbursed (e.g. revisit), celebrate straight away.
  useEffect(() => {
    if (app?.status === "DISBURSED") setSent(true);
  }, [app?.status]);

  // Mockup flow: approval → STK push (#8) → "Loan Approved" (#9).
  useEffect(() => {
    if (approved && !sent && !auto.current) {
      auto.current = true;
      void startDisbursement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, sent]);

  const startDisbursement = async () => {
    if (!applicationId) return;
    setError(null);
    try {
      const res = await api.post<{ checkoutRequestId: string; status: string }>("/api/loans/disburse", {
        applicationId,
      });
      setCheckoutRequestId(res.checkoutRequestId);
      setStkOpen(true);
    } catch {
      setError("Could not start disbursement. Please try again.");
    }
  };

  if (app?.status === "REJECTED") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <X size={38} className="text-red-400" />
        </div>
        <h1 className="mt-6 text-xl font-extrabold text-ink">Application not approved</h1>
        <p className="mt-2 max-w-xs text-sm text-gray-400">
          Unfortunately your loan request was not approved this time. Try again shortly.
        </p>
        <button
          onClick={() => router.replace("/loans")}
          className="mt-8 rounded-2xl bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-brand"
        >
          Back to loans
        </button>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const summary = loan
    ? [
        { label: "Loan Amount", value: formatKES(loan.principal) },
        { label: "Fee", value: formatKES(loan.fee) },
        { label: "Total Repayment", value: formatKES(loan.totalRepayment) },
        {
          label: "Repayment Period",
          value: `${loan.periodMonths} ${loan.periodMonths === 1 ? "Month" : "Months"}`,
        },
        { label: "Monthly Repayment", value: formatKES(loan.monthlyRepayment) },
      ]
    : [];

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-5">
      <div className="flex items-center justify-between">
        <BackButton fallback="/loans" />
        <button
          onClick={() => router.replace("/dashboard")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-ink transition hover:bg-gray-200"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        {sent && (
          <>
            {CONFETTI.map((c, i) => (
              <motion.span
                key={i}
                initial={{ y: -40, opacity: 1, rotate: 0 }}
                animate={{ y: 520, opacity: [1, 1, 0], rotate: 360 }}
                transition={{ duration: 2.2, delay: c.delay, ease: "easeIn" }}
                className="absolute top-0 rounded-sm"
                style={{
                  left: `${c.left}%`,
                  width: c.size,
                  height: c.size * 1.6,
                  backgroundColor: c.color,
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="relative flex h-28 w-20 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand"
            >
              <Smartphone size={38} className="text-white" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 12 }}
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card"
              >
                <Check size={18} strokeWidth={3} className="text-brand" />
              </motion.span>
            </motion.div>

            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-7 text-2xl font-extrabold tracking-tight text-ink"
            >
              Loan Approved!
            </motion.h1>
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-2 text-sm text-gray-500"
            >
              {formatKES(loan?.principal ?? Number(router.query.amount ?? 0))} has been sent to your
              M-Pesa
            </motion.p>

            {summary.length > 0 && (
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-6 w-full rounded-3xl bg-white p-2 text-left shadow-card"
              >
                {summary.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-3">
                    <span className="text-sm font-medium text-gray-500">{r.label}</span>
                    <span className="text-sm font-extrabold text-ink">{r.value}</span>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-7 w-full space-y-3"
            >
              <button
                onClick={() => router.replace(`/loans/${loanId}`)}
                className="w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
              >
                View Loan Details
              </button>
              <button
                onClick={() => router.replace("/dashboard")}
                className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-base font-bold text-ink transition hover:bg-gray-50"
              >
                Back to Home
              </button>
            </motion.div>
          </>
        )}

        {!sent && (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient shadow-brand">
              <Check size={44} strokeWidth={3} className="text-white" />
            </div>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">Loan Approved!</h1>
            <p className="mt-2 text-sm text-gray-500">
              {formatKES(loan?.principal ?? Number(router.query.amount ?? 0))} is ready to be sent to
              your M-Pesa
            </p>
            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">
                {error}
              </p>
            )}
            <button
              onClick={startDisbursement}
              className="mt-8 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
            >
              Receive on M-Pesa
            </button>
            <button
              onClick={() => router.replace("/dashboard")}
              className="mt-3 w-full rounded-2xl border border-gray-200 bg-white py-4 text-base font-bold text-ink transition hover:bg-gray-50"
            >
              Back to Home
            </button>
          </>
        )}
      </div>

      <MpesaStkModal
        open={stkOpen}
        onClose={() => setStkOpen(false)}
        amount={loan?.principal ?? Number(router.query.amount ?? 0)}
        label="loan disbursement"
        onDone={() => {
          setStkOpen(false);
          setSent(true);
        }}
        checkoutRequestId={checkoutRequestId}
      />
    </div>
  );
}
