import useSWR from "swr";
import { useState } from "react";
import { motion } from "framer-motion";
import { Banknote, PiggyBank, Wallet } from "lucide-react";
import Card from "@/components/ui/Card";
import BackButton from "@/components/ui/BackButton";
import { formatKES, formatDateTime } from "@/utils/format";

const CATEGORIES = [
  { key: "ALL", label: "All" },
  { key: "LOANS", label: "Loans" },
  { key: "REPAYMENTS", label: "Repayments" },
  { key: "SAVINGS", label: "Savings" },
];

const TYPE_ICON: Record<string, typeof Banknote> = {
  LOAN_DISBURSEMENT: Banknote,
  LOAN_REPAYMENT: Wallet,
  LOAN_FEE: Wallet,
  SAVINGS_DEPOSIT: PiggyBank,
  SAVINGS_WITHDRAWAL: Banknote,
};

interface Txn {
  id: string;
  reference: string;
  type: string;
  category: string;
  direction: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}
interface TxnData {
  items: Txn[];
  page: number;
  pages: number;
  total: number;
}

export default function Transactions() {
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const { data } = useSWR<TxnData>(`/api/transactions?category=${category}&page=${page}`);

  const selectCategory = (key: string) => {
    setCategory(key);
    setPage(1);
  };

  return (
    <div className="space-y-4 px-5 pb-6 pt-5">
      <BackButton />

      {/* Filter chips */}
      <div className="-mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => selectCategory(c.key)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                category === c.key
                  ? "bg-brand-gradient text-white shadow-brand"
                  : "bg-white text-gray-500 shadow-card hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200/60" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-gray-400">
            No transactions found in this category
          </p>
        </Card>
      ) : (
        <motion.ul layout className="space-y-2.5">
          {data.items.map((t, i) => {
            const Icon = TYPE_ICON[t.type] ?? Banknote;
            const credit = t.direction === "CREDIT";
            return (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card className="flex items-center gap-3 !p-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      credit ? "bg-brand-soft" : "bg-orange-50"
                    }`}
                  >
                    <Icon size={17} className={credit ? "text-brand" : "text-orange-500"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{t.description}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-extrabold ${credit ? "text-brand" : "text-red-500"}`}>
                      {credit ? "+" : "−"}
                      {formatKES(t.amount)}
                    </p>
                    <p className="text-[11px] font-semibold text-gray-400">{t.status}</p>
                  </div>
                </Card>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-card disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-gray-400">
            Page {data.page} of {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-card disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
