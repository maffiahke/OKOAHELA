import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { Leaf, Phone, Lock, Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { phoneSchema } from "@/lib/validation/schemas";

export default function Login() {
  const router = useRouter();
  const { show } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { phone: parsed.data, password });
      show("Welcome back!", "success");
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "NOT_VERIFIED") {
        // Route them to the verification screen with what it needs.
        const userId = (err.details as { userId?: string } | undefined)?.userId;
        const q = new URLSearchParams({ phone: parsed.data });
        if (userId) q.set("userId", userId);
        show("Please verify your phone number to continue.", "info");
        router.push(`/verify?${q.toString()}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (p: string, pwd: string) => {
    setPhone(p);
    setPassword(pwd);
    setError(null);
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6 pt-6">
        <div className="self-start">
          <BackButton fallback="/" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
            <Leaf size={32} className="text-white" />
          </div>
          <span className="mt-2.5 text-xl font-extrabold tracking-tight text-ink">OKOAHELA</span>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">Welcome Back</h1>
          <p className="mt-1 text-sm text-gray-500">Login to access your account</p>
        </motion.div>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+254 712 345 678"
            icon={Phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <div>
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="flex h-8 w-8 items-center justify-center text-gray-400 transition hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => show("Password resets are handled by support in this demo.", "info")}
                className="text-[13px] font-bold text-brand hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-1 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-brand hover:underline">
              Register
            </Link>
          </p>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/60 p-4">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-brand-dark">
            Demo accounts
          </p>
          <div className="mt-2.5 flex flex-col gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => fillDemo("254712345678", "Demo@2024")}
              className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left shadow-card transition hover:bg-gray-50"
            >
              <span className="font-semibold text-ink">Customer · Jay Venas</span>
              <span className="font-medium text-gray-400">Tap to fill</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("254700000001", "Admin@2024")}
              className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left shadow-card transition hover:bg-gray-50"
            >
              <span className="font-semibold text-ink">Admin · Okoahela</span>
              <span className="font-medium text-gray-400">Tap to fill</span>
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Landscape illustration */}
        <div className="pointer-events-none relative mt-8 h-24 select-none overflow-hidden" aria-hidden>
          <svg viewBox="0 0 400 96" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <path d="M0 70 Q 100 20 200 60 T 400 50 V96 H0 Z" fill="#E7F5E2" />
            <path d="M0 84 Q 120 44 240 76 T 400 72 V96 H0 Z" fill="#C9EABC" />
            <circle cx="330" cy="26" r="14" fill="#F0F9EC" />
          </svg>
        </div>
      </div>
    </main>
  );
}
