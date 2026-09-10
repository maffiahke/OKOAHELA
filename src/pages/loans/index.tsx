import useSWR from "swr";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Banknote, ChevronRight, Loader2 } from "lucide-react";
import { formatKES } from "@/utils/format";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/client/api";

interface LoanProduct {
  id: string;
  name: string;
  amount: number;
  feeRate: number;
  periodMonths: number;
  description: string;
}

export default function LoanProducts() {
  const router = useRouter();
  const { data: products, error } = useSWR<LoanProduct[]>("/api/loan-products", api.get);

  return (
    <div className="flex flex-col px-5 pb-6 pt-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Loan Products</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">Choose your loan amount</p>
      </motion.div>

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

      <div className="mt-6 flex flex-col gap-3">
        {products?.map((p, i) => {
          const fee = Math.round(p.amount * p.feeRate);
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => router.push(`/loans/details?productId=${p.id}`)}
              className="flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-card transition hover:shadow-float"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient shadow-brand">
                <Banknote size={22} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold tracking-tight text-ink">
                  {formatKES(p.amount)}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-gray-400">
                  Fee: {formatKES(fee)} · {p.periodMonths} {p.periodMonths === 1 ? "Month" : "Months"}
                </p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-gray-300" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
