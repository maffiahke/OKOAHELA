import useSWR from "swr";
import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { formatKES, formatDateTime } from "@/utils/format";
import { formatPhoneDisplay as fmtPhone } from "@/lib/validation/schemas";

interface Withdrawal {
  id: string;
  reference: string;
  customer: string;
  phone: string;
  amount: number;
  mpesaNumber: string;
  status: string;
  note: string | null;
  mpesaTransactionId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_TABS = ["PENDING", "APPROVED", "PROCESSED", "ALL"];

function AdminWithdrawalsBody() {
  const { show } = useToast();
  const [tab, setTab] = useState("PENDING");
  const { data, mutate } = useSWR<{ items: Withdrawal[] }>(
    `/api/admin/withdrawals?status=${tab}`,
    { refreshInterval: tab === "APPROVED" ? 15000 : 0 },
  );

  const [deciding, setDeciding] = useState<string | null>(null);

  const decide = async (id: string, decision: "APPROVE" | "REJECT") => {
    const note =
      decision === "REJECT" ? window.prompt("Reason for rejection (optional)") ?? undefined : undefined;
    setDeciding(id);
    try {
      await api.post(`/api/admin/withdrawals/${id}/decision`, { decision, note });
      show(
        decision === "APPROVE"
          ? "Withdrawal approved — payout sent to M-Pesa"
          : "Withdrawal rejected",
        "success",
      );
      mutate();
    } catch (e) {
      show(e instanceof ApiClientError ? e.message : "Decision failed", "error");
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallback="/admin" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Withdrawal Requests</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">
        Approve to send the M-Pesa payout, or reject. Balances are only debited when a payout settles.
      </p>

      {/* Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === t ? "bg-brand-gradient text-white shadow-brand" : "bg-white text-gray-500 shadow-card hover:text-ink"
            }`}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-gray-200/60" />)}
        </div>
      ) : data.items.length === 0 ? (
        <Card><p className="py-10 text-center text-sm text-gray-400">No {tab === "ALL" ? "" : tab.toLowerCase()} withdrawal requests</p></Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {data.items.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink">{w.customer}</p>
                    <p className="text-xs text-gray-400">{fmtPhone(w.phone)} · pays {fmtPhone(w.mpesaNumber)}</p>
                  </div>
                  <Badge status={w.status} />
                </div>

                <div className="mt-4 flex items-end justify-between rounded-2xl bg-surface px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">AMOUNT TO PAYOUT</p>
                    <p className="text-xl font-extrabold text-ink">{formatKES(w.amount)}</p>
                  </div>
                  <p className="text-xs text-gray-400">{w.reference}</p>
                </div>

                {w.note && <p className="mt-2 text-xs italic text-gray-500">Note: {w.note}</p>}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{formatDateTime(w.createdAt)}</p>
                  {w.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" loading={deciding === w.id} onClick={() => decide(w.id, "REJECT")}>
                        <XCircle size={14} /> Reject
                      </Button>
                      <Button size="sm" loading={deciding === w.id} onClick={() => decide(w.id, "APPROVE")}>
                        <CheckCircle2 size={14} /> Approve & Pay
                      </Button>
                    </div>
                  ) : w.status === "APPROVED" ? (
                    <span className="text-xs font-semibold text-amber-600">Payout in flight…</span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-300">Reviewed</span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function AdminWithdrawals() {
  return (
    <AdminLayout>
      <AdminWithdrawalsBody />
    </AdminLayout>
  );
}
