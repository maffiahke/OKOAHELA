import useSWR from "swr";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Banknote, ChevronRight, Loader2, Lock, PiggyBank, TrendingUp } from "lucide-react";
import { formatKES } from "@/utils/format";
import BackButton from "@/components/ui/BackButton";
import ProductBadge from "@/components/loans/ProductBadge";
import { api } from "@/lib/client/api";

interface LoanProduct {
  id: string;
  name: string;
  amount: number;
  flatFee: number;
  fee: number;
  periodMonths: number;
  description: string;
  badge: string | null;
  minSavings: number;
  locked: boolean;
}

interface LoanProductsResponse {
  savingsBalance: number;
  loanLimit: number;
  products: LoanProduct[];
}

function compact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return `${n}`;
}

export default function LoanProducts() {
  const router = useRouter();
  const { data, error } = useSWR<LoanProductsResponse>("/api/loan-products", api.get);
  const products = data?.products;

  const unlockedCount = products?.filter((p) => !p.locked).length ?? 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-deep">
      {/* Dark green → yellow radial wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-home-radial" />
      <div aria-hidden className="pointer-events-none absolute -right-14 top-8 h-56 w-56 rounded-full bg-yellow-300/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-brand-bright/10 blur-3xl" />

      <div className="relative flex flex-col px-5 pb-8 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Loan Products</h1>
          </div>
          <p className="mt-1 text-sm text-brand-bright/90">Every KES 1 saved unlocks KES 2 of credit</p>
        </motion.div>

        {/* Limit summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-5 overflow-hidden rounded-3xl bg-white/10 p-5 shadow-float ring-1 ring-yellow-400/25 backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/20 ring-1 ring-yellow-400/40">
                <TrendingUp size={22} className="text-yellow-300" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Your loan limit</p>
                <p className="text-xl font-extrabold text-white">{formatKES(data?.loanLimit ?? 0)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Savings</p>
              <p className="flex items-center justify-end gap-1 text-sm font-extrabold text-brand-bright">
                <PiggyBank size={14} />
                {formatKES(data?.savingsBalance ?? 0)}
              </p>
            </div>
          </div>
          {products && products.length > 0 && (
            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-mid to-yellow-400"
                  style={{ width: `${Math.round((unlockedCount / products.length) * 100)}%` }}
                />
              </div>
              <p className="whitespace-nowrap text-[11px] font-bold text-white/80">
                {unlockedCount}/{products.length} unlocked
              </p>
            </div>
          )}
        </motion.div>

        {error && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            Could not load loan products. Please try again.
          </p>
        )}

        {!products && !error && (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-yellow-300" />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {products?.map((p, i) => {
            const feeLabel = formatKES(p.flatFee > 0 ? p.flatFee : p.fee);
            const periodLabel = `${p.periodMonths} ${p.periodMonths === 1 ? "Month" : "Months"}`;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => router.push(`/loans/details?productId=${p.id}`)}
                className={`relative flex items-center gap-4 overflow-hidden rounded-3xl p-4 text-left backdrop-blur-md transition ring-1 ${
                  p.locked
                    ? "bg-black/25 ring-white/10 hover:bg-black/30"
                    : "bg-white/[0.09] ring-yellow-400/25 hover:bg-white/[0.16]"
                }`}
              >
                {!p.locked && (
                  <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-yellow-400/20 blur-2xl" />
                )}
                {p.badge && (
                  <ProductBadge label={p.badge} className="absolute -top-2 right-4 shadow-sm" />
                )}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    p.locked ? "bg-white/10" : "bg-gradient-to-br from-brand-mid to-yellow-400 shadow-brand"
                  }`}
                >
                  {p.locked ? (
                    <Lock size={20} className="text-white/40" />
                  ) : (
                    <Banknote size={22} className="text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-base font-extrabold tracking-tight ${p.locked ? "text-white/50" : "text-white"}`}>
                    {formatKES(p.amount)}
                  </p>
                  {p.locked ? (
                    <p className="mt-0.5 truncate text-[13px] font-bold text-yellow-300/90">
                      Save {compact(p.minSavings)} · Unlock {compact(p.amount)}+
                    </p>
                  ) : (
                    <p className="mt-0.5 truncate text-[13px] text-white/60">
                      Fee: {feeLabel} · {periodLabel}
                    </p>
                  )}
                </div>
                {p.locked ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/50">
                    Locked
                  </span>
                ) : (
                  <ChevronRight size={20} className="shrink-0 text-yellow-300" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
