import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Check, Send, Loader2 } from "lucide-react";
import { formatKES } from "@/utils/format";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/ui/BackButton";

const STAGES = ["Application received", "Credit check", "M-Pesa verification", "Funds disbursement"];

export default function LoanProcessing() {
  const router = useRouter();
  const { show } = useToast();
  const applicationId = String(router.query.applicationId ?? "");
  const amount = Number(router.query.amount ?? 0);
  const initialStatus = String(router.query.status ?? "PENDING");

  const [stage, setStage] = useState(0);
  const [outcome, setOutcome] = useState<"processing" | "submitted">("processing");
  const settled = useRef(false);

  // Poll the application status while the stages animate.
  const { data } = useSWR<{ status: string; loanId: string | null }>(
    applicationId && outcome === "processing" ? `/api/loans/status/${applicationId}` : null,
    api.get,
    { refreshInterval: 1500 },
  );

  // Play through the checklist while the (mostly instant) decision lands.
  useEffect(() => {
    if (outcome !== "processing") return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(t);
  }, [outcome]);

  useEffect(() => {
    if (!router.isReady || settled.current) return;
    // Auto-approved applications skip straight past the review stages.
    if (initialStatus === "APPROVED" && stage >= STAGES.length - 1) {
      settled.current = true;
      router.replace(`/loans/confirm-disbursement?applicationId=${applicationId}&amount=${amount}`);
    }
  }, [router.isReady, initialStatus, stage, applicationId, amount, router]);

  useEffect(() => {
    if (!data?.status || settled.current) return;
    if (data.status === "APPROVED" || data.status === "DISBURSED") {
      settled.current = true;
      router.replace(`/loans/confirm-disbursement?applicationId=${applicationId}&amount=${amount}`);
    } else if (data.status === "REJECTED") {
      settled.current = true;
      show("Unfortunately your application was not approved.", "error");
      router.replace("/loans");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  // When every stage has played and the application is still pending, show the
  // "Application Submitted" screen (mockup #13).
  useEffect(() => {
    if (outcome === "processing" && stage === STAGES.length - 1 && data?.status === "PENDING") {
      const t = setTimeout(() => setOutcome("submitted"), 900);
      return () => clearTimeout(t);
    }
  }, [stage, data?.status, outcome]);

  if (outcome === "submitted") {
    return <ApplicationSubmitted amount={amount} onDone={() => router.replace("/loans")} />;
  }

  return (
    <main className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-deep">
      {/* glow + wave backdrop */}
      <div className="absolute inset-0 bg-brand-gradient opacity-90" />
      <motion.div
        className="absolute -bottom-16 left-1/2 h-64 w-[140%] -translate-x-1/2 rounded-[45%] bg-brand/30 blur-2xl"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        viewBox="0 0 400 120"
        className="absolute bottom-0 left-0 h-28 w-full"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0 60 Q 50 20 100 60 T 200 60 T 300 60 T 400 60 V120 H0 Z"
          fill="#01FF01"
          fillOpacity="0.18"
          animate={{ x: [0, -200] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M0 80 Q 50 45 100 80 T 200 80 T 300 80 T 400 80 V120 H0 Z"
          fill="#01FF01"
          fillOpacity="0.12"
          animate={{ x: [0, -200] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
      </motion.svg>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pb-10 pt-16 text-center">
        <div className="absolute left-6 top-5 z-10">
          <BackButton light />
        </div>
        {/* Glowing check circle */}
        <div className="relative mb-9 flex h-32 w-32 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-bright/25"
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.span
            className="absolute inset-2 rounded-full border-[3px] border-bright/60"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
          />
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient shadow-[0_0_60px_rgba(1,255,1,0.55)]">
            <Check size={46} strokeWidth={3} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-white">Processing...</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Your loan request is being processed. This may take a few minutes.
        </p>

        {/* Checklist */}
        <ul className="mt-9 w-full max-w-[280px] space-y-3.5 text-left">
          {STAGES.map((s, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-bright text-deep"
                      : active
                        ? "border-2 border-bright/70 bg-white/10 text-white"
                        : "border border-white/25 text-white/40"
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : active ? <Loader2 size={13} className="animate-spin" /> : ""}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    done ? "text-white" : active ? "text-white/90" : "text-white/40"
                  }`}
                >
                  {s}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex-1" />
        <p className="text-[11px] font-medium text-white/50">You can keep this screen open.</p>
      </div>
    </main>
  );
}

function ApplicationSubmitted({ amount, onDone }: { amount: number; onDone: () => void }) {
  const timeline = ["Application Received", "Under Review", "Approval", "Disbursement"];
  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-8 text-center"
      >
        <div className="absolute left-6 top-5 z-10">
          <BackButton />
        </div>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient shadow-brand"
        >
          <Send size={40} className="-rotate-12 text-white" />
        </motion.div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">
          Application Submitted!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          We have received your loan application. You&apos;ll be notified once it&apos;s reviewed.
        </p>

        <div className="mt-6 w-full rounded-3xl bg-brand-gradient p-5 shadow-brand">
          <p className="text-2xl font-extrabold tracking-tight text-white">{formatKES(amount)}</p>
          <p className="mt-1 text-xs font-semibold text-white/85">Requested Amount</p>
        </div>

        {/* Timeline */}
        <div className="mt-7 w-full rounded-3xl bg-white p-5 text-left shadow-card">
          {timeline.map((t, i) => (
            <div key={t} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i === 0 ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                {i < timeline.length - 1 && (
                  <span className={`my-1 w-0.5 flex-1 rounded ${i === 0 ? "bg-brand/40" : "bg-gray-200"}`} />
                )}
              </div>
              <div className="pb-5 pt-1">
                <p className={`text-sm font-bold ${i === 0 ? "text-ink" : "text-gray-400"}`}>{t}</p>
                {i === 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">We got your request — sit tight!</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDone}
          className="mt-7 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
        >
          Got it
        </button>
      </motion.div>
    </main>
  );
}
