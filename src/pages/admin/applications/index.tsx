import useSWR from "swr";
import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import BackButton from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError } from "@/lib/client/api";
import { formatKES } from "@/utils/format";
import { formatPhoneDisplay as fmtPhone } from "@/lib/validation/schemas";

interface Application {
  id: string;
  reference: string;
  customer: { id: string; fullName: string; phone: string };
  product: string;
  amount: number;
  fee: number;
  totalRepayment: number;
  monthlyRepayment: number;
  periodMonths: number;
  mpesaNumber: string;
  idNumber: string | null;
  gender: string | null;
  maritalStatus: string | null;
  county: string | null;
  loanPurpose: string | null;
  nextOfKin: { name: string | null; phone: string | null; relationship: string | null } | null;
  status: string;
  createdAt: string;
}

const pretty = (v: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : "—");

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-gray-400">{label}</span>
      <span className="text-right text-xs font-bold text-ink">{value}</span>
    </div>
  );
}

const STATUS_TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

function AdminApplicationsBody() {
  const { show } = useToast();
  const [tab, setTab] = useState("PENDING");
  const { data, mutate } = useSWR<Application[]>(`/api/admin/applications?status=${tab}`);

  const [deciding, setDeciding] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const decide = async (appId: string, decision: "APPROVE" | "REJECT") => {
    setDeciding(appId);
    try {
      await api.post(`/api/admin/applications/${appId}/decision`, { decision });
      show(`Application ${decision === "APPROVE" ? "approved" : "rejected"}`, "success");
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
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Loan Applications</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">Review and approve customer loan requests</p>

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
      ) : data.length === 0 ? (
        <Card><p className="py-10 text-center text-sm text-gray-400">No {tab === "ALL" ? "" : tab.toLowerCase()} applications</p></Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {data.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink">{a.customer.fullName}</p>
                    <p className="text-xs text-gray-400">{fmtPhone(a.customer.phone)} · {a.product}</p>
                  </div>
                  <Badge status={a.status} />
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surface px-4 py-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">AMOUNT</p>
                    <p className="text-sm font-extrabold text-ink">{formatKES(a.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">TERM</p>
                    <p className="text-sm font-extrabold text-ink">{a.periodMonths} mo</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">MONTHLY</p>
                    <p className="text-sm font-extrabold text-ink">{formatKES(a.monthlyRepayment)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400">TOTAL</p>
                    <p className="text-sm font-extrabold text-ink">{formatKES(a.totalRepayment)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className="mt-3 flex w-full items-center justify-between rounded-2xl bg-brand-softer px-4 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-soft"
                >
                  Applicant details
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${expanded === a.id ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded === a.id && (
                  <div className="mt-2 grid gap-x-6 rounded-2xl border border-gray-100 bg-white px-4 py-3 sm:grid-cols-2">
                    <div>
                      <DetailRow label="ID Number" value={a.idNumber ?? "—"} />
                      <DetailRow label="Gender" value={pretty(a.gender)} />
                      <DetailRow label="Marital status" value={pretty(a.maritalStatus)} />
                      <DetailRow label="County" value={a.county ?? "—"} />
                    </div>
                    <div>
                      <DetailRow label="Loan purpose" value={a.loanPurpose ?? "—"} />
                      <DetailRow
                        label="Next of kin"
                        value={a.nextOfKin?.name ?? "—"}
                      />
                      <DetailRow label="Kin phone" value={a.nextOfKin?.phone ? fmtPhone(a.nextOfKin.phone) : "—"} />
                      <DetailRow label="Kin relationship" value={a.nextOfKin?.relationship ?? "—"} />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{a.reference} · {new Date(a.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
                  {a.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" loading={deciding === a.id} onClick={() => decide(a.id, "REJECT")}>
                        <XCircle size={14} /> Reject
                      </Button>
                      <Button size="sm" loading={deciding === a.id} onClick={() => decide(a.id, "APPROVE")}>
                        <CheckCircle2 size={14} /> Approve
                      </Button>
                    </div>
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


export default function AdminApplications() {
  return (
    <AdminLayout>
      <AdminApplicationsBody />
    </AdminLayout>
  );
}
