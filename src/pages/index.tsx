import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Leaf, ArrowRight, Smartphone, ShieldCheck, Sparkles } from "lucide-react";

const chips = [
  { icon: Sparkles, label: "Fast" },
  { icon: ShieldCheck, label: "Secure" },
  { icon: Leaf, label: "Flexible" },
];

export default function Landing() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-brand-deep lg:items-center">
      {/* Dark green → yellow radial wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-home-radial" />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-yellow-300/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-brand-bright/10 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Leaf size={34} className="text-white" />
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">OKOAHELA</h1>
          <p className="mt-1.5 text-sm font-medium text-white/85">Pata Loan Haraka. Okoa Leo.</p>
        </motion.div>

        {/* Hero illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="relative mx-auto mt-8 flex w-full max-w-[290px] items-end justify-center"
        >
          <div className="relative flex w-full flex-col items-center">
            <div className="relative flex h-56 w-44 items-center justify-center rounded-[2.5rem] border-[6px] border-white/90 bg-deep shadow-float">
              <div className="absolute inset-3 rounded-[1.9rem] bg-gradient-to-b from-brand/40 to-transparent" />
              <div className="relative flex flex-col items-center gap-2 text-white">
                <Smartphone size={44} strokeWidth={1.6} />
                <div className="h-1.5 w-16 rounded-full bg-white/70" />
                <div className="h-1.5 w-10 rounded-full bg-white/40" />
              </div>
              <div className="absolute -right-7 top-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card">
                <ShieldCheck size={24} className="text-brand" />
              </div>
              <div className="absolute -left-8 bottom-14 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card">
                <span className="text-sm font-extrabold text-brand">KES</span>
              </div>
            </div>
            <div className="mt-4 h-4 w-52 rounded-[100%] bg-black/15 blur-md" />
          </div>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-7 flex items-center justify-center gap-3"
        >
          {chips.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur"
            >
              <Icon size={13} />
              {label}
            </span>
          ))}
        </motion.div>

        <div className="flex-1" />

        {/* Bottom card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-3xl bg-white p-6 text-center shadow-float"
        >
          <h2 className="text-xl font-extrabold text-ink">Your Financial Partner</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Get quick loans, grow your savings and achieve your goals with OKOAHELA.
          </p>
          <button
            onClick={() => router.push("/register")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-400 py-4 text-base font-extrabold text-brand-deep shadow-[0_10px_28px_-8px_rgba(250,204,21,0.55)] transition hover:brightness-105 active:scale-[0.98]"
          >
            Get Started
            <ArrowRight size={18} />
          </button>
          <p className="mt-4 text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Login
            </Link>
          </p>

          <div className="mt-5 flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-6 rounded-full bg-brand" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          </div>
        </motion.div>
      </div>
    </main>
  );
}
