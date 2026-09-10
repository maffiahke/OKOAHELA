import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BackButton from "@/components/ui/BackButton";
import OtpInput from "@/components/ui/OtpInput";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { phoneSchema, passwordSchema } from "@/lib/validation/schemas";

export default function ForgotPassword() {
  const router = useRouter();
  const { show } = useToast();

  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The reset code is generated server-side and auto-filled (same delivery
  // model as activation codes — no SMS gateway in this deployment).
  const autoFilledRef = useRef("");
  useEffect(() => {
    if (step === "reset" && otp.length === 6 && code.length === 0 && autoFilledRef.current !== otp) {
      autoFilledRef.current = otp;
      const t = setTimeout(() => setCode(otp), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ userId: string; otp: string }>("/api/auth/forgot-password", {
        phone: parsed.data,
      });
      setUserId(res.userId);
      autoFilledRef.current = "";
      setCode("");
      setOtp(res.otp);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start password reset");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwd = passwordSchema.safeParse(password);
    if (!pwd.success) {
      setError(pwd.error.issues[0]?.message ?? "Choose a stronger password");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { userId, code, newPassword: pwd.data });
      show("Password reset! Log in with your new password.", "success");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not reset password");
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const res = await api.post<{ otp: string }>("/api/auth/forgot-password", { phone });
      autoFilledRef.current = "";
      setCode("");
      setOtp(res.otp);
      show("A new reset code has been generated", "success");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not resend code");
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10">
        <div className="flex items-center gap-3 py-4">
          <BackButton fallback="/login" />
          <h1 className="text-lg font-extrabold tracking-tight text-ink">Reset Password</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col justify-center"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient shadow-brand">
              <KeyRound size={38} className="text-white" strokeWidth={2.2} />
            </div>
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-ink">
              {step === "phone" ? "Forgot your password?" : "Enter new password"}
            </h2>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-gray-500">
              {step === "phone"
                ? "Enter your registered phone number and we'll generate a 6-digit reset code."
                : `We've generated a 6-digit code for ${phone} — it auto-fills below.`}
            </p>
            {step === "reset" && otp && (
              <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-bold text-brand-dark">
                Reset code: <span className="tracking-[0.3em]">{otp}</span>{" "}
                <span className="text-xs font-semibold text-brand-dark/70">· auto-fills</span>
              </div>
            )}
          </div>

          {step === "phone" ? (
            <form onSubmit={requestCode} className="mt-8">
              <label className="block text-xs font-bold text-gray-500">PHONE NUMBER</label>
              <Input
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5"
              />
              {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
              <Button fullWidth size="lg" className="mt-5" loading={loading} type="submit">
                Send Reset Code
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="mt-8">
              <div className="mx-auto w-fit">
                <OtpInput value={code} onChange={setCode} />
              </div>
              <label className="mt-6 block text-xs font-bold text-gray-500">NEW PASSWORD</label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
              <Button fullWidth size="lg" className="mt-5" loading={loading} type="submit">
                Reset Password
              </Button>
              <button
                type="button"
                onClick={resend}
                className="mt-4 w-full text-center text-[13px] font-bold text-brand hover:underline"
              >
                Generate a new code
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Remembered it?{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Back to Login
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
