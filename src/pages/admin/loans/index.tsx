import useSWR from "swr";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import BackButton from "@/components/ui/BackButton";
import { formatKES } from "@/utils/format";

interface LoanRow {
  id: string;
  reference: string;
  customer: { id: string; fullName: string; phone: string };
  principal: number;
  totalRepayment: number;
  amountPaid: number;
  remaining: number;
  periodMonths: number;
  status: string;
  dueDate: string | null;
  disbursedAt: string | null;
}

const TABS = ["ALL", "ACTIVE", "OVERDUE", "FULLY_REPAID"];

export default function AdminLoans() {
  const [tab, setTab] = useState("ALL");
  const { data } = useSWR<LoanRow[]>(`/api/admin/loans?status=${tab}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallback="/admin" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Loans</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">All disbursed loans and their repayment health</p>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === t ? "bg-brand-gradient text-white shadow-brand" : "bg-white text-gray-500 shadow-card hover:text-ink"
            }`}
          >
            {t === "FULLY_REPAID" ? "Fully repaid" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-200/60" />)}
        </div>
      ) : data.length === 0 ? (
        <Card><p className="py-10 text-center text-sm text-gray-400">No loans in this view</p></Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-surface text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Principal</th>
                  <th className="px-4 py-3.5">Repaid</th>
                  <th className="px-4 py-3.5">Remaining</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="px-4 py-3.5">Due</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((l) => {
                  const pct = l.totalRepayment > 0 ? Math.round((l.amountPaid / l.totalRepayment) * 100) : 0;
                  return (
                    <tr key={l.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5 font-bold text-ink">{l.reference}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">{l.customer.fullName}</p>
                        <p className="text-xs text-gray-400">{l.customer.phone}</p>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-ink">{formatKES(l.principal)}</td>
                      <td className="px-4 py-3.5 font-bold text-brand">{formatKES(l.amountPaid)}</td>
                      <td className="px-4 py-3.5 font-bold text-ink">{formatKES(l.remaining)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {l.dueDate ? new Date(l.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="px-4 py-3.5"><Badge status={l.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
