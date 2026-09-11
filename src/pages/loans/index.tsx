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

function unlockHint(minSavings: number): string {
  if (minSavings <= 0) return "Locked";
  if (minSavings >= 1000) {
    const k = minSavings / 1000;
    return `Save ${k % 1 === 0 ? k : k.toFixed(1)}K to unlock`;
  }
  return `Save ${minSavings} to unlock`;
}

export default function LoanProducts() {
  const router = useRouter();
  const { data, error } = useSWR<LoanProductsResponse>("/api/loan-products", api.get);
  const products = data?.products;

  const unlockedCount = products?.filter((p) => !p.locked).length ?? 0;

  return (
    <div className="flex flex-col px-5 pb-6 pt-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Loan Products</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">Every KES 1 saved unlocks KES 2 of credit</p>
      </motion.div>

      {/* Limit summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-4 flex items-center justify-between rounded-3xl bg-brand-dark px-5 py-4 shadow-brand"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <TrendingUp size={22} className="text-brand-bright" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-soft/70">Your loan limit</p>
            <p className="text-xl font-extrabold text-white">{formatKES(data?.loanLimit ?? 0)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-soft/70">Savings</p>
          <p className="flex items-center justify-end gap-1 text-sm font-extrabold text-brand-bright">
            <PiggyBank size={14} />
            {formatKES(data?.savingsBalance ?? 0)}
          </p>
        </div>
      </motion.div>

      {products && products.length > 0 && (
        <p className="mt-4 text-xs font-semibold text-gray-400">
          {unlockedCount} of {products.length} products unlocked · save more to unlock bigger loans
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          Could not load loan products. Please try again.
        </p>
      )}

      {!products && !error && (
        <div className="mt-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3">
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
              className="relative flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-card transition hover:shadow-float"
            >
              {p.badge && (
                <ProductBadge label={p.badge} className="absolute -top-2 right-4 shadow-sm" />
              )}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  p.locked ? "bg-gray-100" : "bg-brand-gradient shadow-brand"
                }`}
              >
                {p.locked ? (
                  <Lock size={20} className="text-gray-400" />
                ) : (
                  <Banknote size={22} className="text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-extrabold tracking-tight ${p.locked ? "text-gray-400" : "text-ink"}`}>
                  {formatKES(p.amount)}
                </p>
                {p.locked ? (
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-gray-400">{unlockHint(p.minSavings)}</p>
                ) : (
                  <p className="mt-0.5 truncate text-[13px] text-gray-400">
                    Fee: {feeLabel} · {periodLabel}
                  </p>
                )}
              </div>
              {p.locked ? (
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-400">
                  Locked
                </span>
              ) : (
                <ChevronRight size={20} className="shrink-0 text-gray-300" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
