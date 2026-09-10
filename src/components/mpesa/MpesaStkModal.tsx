import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Smartphone, X, Send } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { api } from "@/lib/client/api";
import { formatPhoneDisplay } from "@/lib/validation/schemas";

type Stage = "waiting" | "success" | "failed";

interface Props {
  open: boolean;
  checkoutRequestId: string | null;
  amount: number | null;
  phone?: string;
  label?: string;
  onDone: () => void; // settled — parent should refresh data
  onFailed?: () => void;
  onClose: () => void;
}

const STEPS_PAYBILL = ["Open the M-Pesa prompt", "Enter your M-Pesa PIN", "Confirm payment"];
const STEPS_PAYOUT = ["Request sent to Safaricom", "Money arrives in your M-Pesa", "Confirmation SMS"];
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 5 * 60 * 1000;

export default function MpesaStkModal({
  open,
  checkoutRequestId,
  amount,
  phone,
  label = "Payment",
  onDone,
  onFailed,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>("waiting");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("Unable to complete the payment. Please try again.");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);

  const payout = /disbursement|withdrawal|payout/i.test(label);

  const stopTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  const checkStatus = useCallback(async () => {
    if (!checkoutRequestId || settledRef.current) return;
    try {
      const tx = await api.get<{ status: string; receipt: string | null; resultDesc: string | null }>(
        `/api/mpesa/status?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`,
      );
      if (tx.status === "SUCCESS" && !settledRef.current) {
        settledRef.current = true;
        stopTimers();
        setReceipt(tx.receipt);
        setStage("success");
        onDone();
      } else if (tx.status === "FAILED" && !settledRef.current) {
        settledRef.current = true;
        stopTimers();
        if (tx.resultDesc) setReason(tx.resultDesc);
        setStage("failed");
        onFailed?.();
      }
    } catch {
      /* keep polling — transient network/server errors */
    }
  }, [checkoutRequestId, onDone, onFailed]);

  useEffect(() => {
    if (!open || !checkoutRequestId) return;
    settledRef.current = false;
    setStage("waiting");
    setReceipt(null);

    void checkStatus();
    pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      stopTimers();
      setReason(
        payout
          ? "The payout is still processing on Safaricom's side. We'll confirm it automatically once it settles."
          : "We didn't get a response in time. If you already entered your PIN, the payment will confirm automatically.",
      );
      setStage("failed");
      onFailed?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, TIMEOUT_MS);
    return stopTimers;
  }, [open, checkoutRequestId, checkStatus]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      persistent={stage === "waiting"}
      title={stage === "waiting" ? (payout ? "M-Pesa Payout" : "M-Pesa Payment") : undefined}
    >
      <AnimatePresence mode="wait">
        {stage === "waiting" && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-2"
          >
            {/* Amount card */}
            <div className="flex items-center justify-between rounded-3xl bg-brand-gradient p-5 shadow-brand">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  {payout ? "Amount to Receive" : "Amount"}
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-white">
                  KES {amount?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <Check size={22} strokeWidth={3} className="text-white" />
              </div>
            </div>

            {/* Request card */}
            <div className="mt-3 rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    {payout ? "Sending to your M-Pesa" : "STK Push to M-Pesa"}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    {payout ? "The money is on its way to " : "We will send an M-Pesa request to "}
                    <span className="font-bold text-ink">
                      {phone ? formatPhoneDisplay(phone) : "your number"}
                    </span>
                  </p>
                </div>
                <div className="relative flex h-16 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-brand/30 bg-brand-soft">
                  <Smartphone size={24} className="text-brand" />
                  <motion.span
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand"
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Send size={10} className="text-white" />
                  </motion.span>
                </div>
              </div>

              <ol className="mt-4 flex flex-col gap-2.5">
                {(payout ? STEPS_PAYOUT : STEPS_PAYBILL).map((s, i) => (
                  <Step key={s} s={s} i={i} />
                ))}
              </ol>
            </div>

            {/* Waiting pill */}
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2.5">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-brand"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
                <span className="text-xs font-bold text-brand-dark">
                  {payout ? "Processing your payout..." : "Waiting for your M-Pesa PIN..."}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {stage === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center py-3 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient shadow-brand"
            >
              <Check size={40} className="text-white" strokeWidth={3} />
            </motion.div>
            <h3 className="mt-5 text-lg font-extrabold text-ink">Success!</h3>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-gray-500">
              Your {label.toLowerCase()} of{" "}
              <span className="font-bold text-ink">KES {amount?.toLocaleString() ?? "—"}</span> was
              successful.
            </p>
            {receipt && (
              <p className="mt-1.5 text-xs font-semibold text-gray-400">M-Pesa Receipt: {receipt}</p>
            )}
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
            >
              OK
            </button>
          </motion.div>
        )}

        {stage === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-3 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <X size={38} className="text-red-500" strokeWidth={2.6} />
            </div>
            <h3 className="mt-5 text-lg font-extrabold text-ink">
              {payout ? "Payout Pending" : "Payment Not Completed"}
            </h3>
            <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-gray-500">{reason}</p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function Step({ s, i }: { s: string; i: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-dark">
        {i + 1}
      </span>
      <span className="text-[13px] font-semibold text-gray-600">{s}</span>
    </li>
  );
}
