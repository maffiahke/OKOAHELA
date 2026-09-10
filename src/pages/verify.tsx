import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import OtpInput from "@/components/ui/OtpInput";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { formatPhoneDisplay } from "@/lib/validation/schemas";

export default function Verify() {
  const router = useRouter();
  const { show } = useToast();
  const userId = String(router.query.userId ?? "");
  const phone = String(router.query.phone ?? "");
  const [demoOtp, setDemoOtp] = useState(String(router.query.demoOtp ?? ""));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(45);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  // Demo mode: auto-fill the randomly generated code so activation is hands-free.
  // autoFilledRef guards against refilling a code that already failed (e.g. expired).
  const autoFilledRef = useRef("");
  useEffect(() => {
    if (demoOtp.length === 6 && code.length === 0 && !busy && autoFilledRef.current !== demoOtp) {
      autoFilledRef.current = demoOtp;
      const t = setTimeout(() => setCode(demoOtp), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOtp]);

  useEffect(() => {
    if (code.length === 6) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const verify = async (c: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/verify-otp", { userId, code: c });
      show("Phone verified! Welcome to Okoahela 🎉", "success");
      router.replace("/dashboard");
    } catch (e) {
      setCode("");
      setError(e instanceof ApiClientError ? e.message : "Verification failed");
      setBusy(false);
    }
  };

  const resend = async () => {
    if (seconds > 0) return;
    setResending(true);
    try {
      const res = await api.post<{ demoOtp?: string }>("/api/auth/resend-otp", { userId });
      setSeconds(45);
      if (res?.demoOtp) setDemoOtp(res.demoOtp);
      show("A new code is on its way", "success");
    } catch (e) {
      show(e instanceof ApiClientError ? e.message : "Could not resend code", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10">
        <div className="flex items-center gap-3 py-4">
          <BackButton fallback="/register" />
          <h1 className="text-lg font-extrabold tracking-tight text-ink">Verify Your Phone</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          <p className="text-sm leading-relaxed text-gray-500">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-bold text-ink">
              {phone ? formatPhoneDisplay(phone) : "your phone"}
            </span>
          </p>

          {demoOtp && (
            <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-bold text-brand-dark">
              Demo code: <span className="tracking-[0.3em]">{demoOtp}</span>{" "}
              <span className="text-xs font-semibold text-brand-dark/70">· auto-fills</span>
            </div>
          )}

          <div className="mt-8 w-full">
            <OtpInput value={code} onChange={setCode} />
          </div>

          {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}

          <div className="mt-6 h-6">
            {seconds > 0 ? (
              <p className="text-sm text-gray-400">
                Resend code in{" "}
                <span className="font-bold text-ink">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </span>
              </p>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-sm font-bold text-brand disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>

          {/* Keep your account safe */}
          <div className="mt-8 w-full rounded-3xl bg-brand-gradient p-6 text-left shadow-brand">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <ShieldCheck size={26} className="text-white" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white">Keep your account safe</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/85">
                  This helps us verify your identity and protect your account.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-10 w-7 rounded-md border-2 border-white/60" />
              <div className="h-10 w-7 rounded-md border-2 border-white/40" />
              <div className="h-10 w-7 rounded-md border-2 border-white/25" />
            </div>
          </div>

          <div className="mt-8 w-full">
            <Button
              fullWidth
              size="lg"
              loading={busy || code.length === 6}
              disabled={code.length !== 6}
              onClick={() => verify(code)}
            >
              Verify
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Wrong number?{" "}
            <Link href="/register" className="font-bold text-brand">
              Go back
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
