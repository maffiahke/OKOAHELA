import useSWR from "swr";
import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import { Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import BackButton from "@/components/ui/BackButton";
import Input from "@/components/ui/Input";
import { formatKES } from "@/utils/format";
import { formatPhoneDisplay } from "@/lib/validation/schemas";

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  kycStatus: string;
  loanLimit: number;
  savings: number;
  activeLoans: number;
  createdAt: string;
}

function AdminCustomersBody() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data } = useSWR<Customer[]>(`/api/admin/customers?q=${encodeURIComponent(query)}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallback="/admin" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Customers</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">{data ? `${data.length} registered customer${data.length === 1 ? "" : "s"}` : "Loading…"}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
        className="relative max-w-md"
      >
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…" className="!pl-11" />
      </form>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-4 py-3.5">KYC</th>
                <th className="px-4 py-3.5">Loan limit</th>
                <th className="px-4 py-3.5">Savings</th>
                <th className="px-4 py-3.5">Active loans</th>
                <th className="px-4 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-6 animate-pulse rounded-xl bg-gray-100" /></td></tr>
                  ))
                : data.map((c) => (
                    <tr key={c.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-ink">{c.fullName}</p>
                        <p className="text-xs text-gray-400">{formatPhoneDisplay(c.phone)}</p>
                      </td>
                      <td className="px-4 py-3.5"><Badge status={c.kycStatus === "VERIFIED" ? "VERIFIED" : "PENDING"} /></td>
                      <td className="px-4 py-3.5 font-extrabold text-ink">{formatKES(c.loanLimit)}</td>
                      <td className="px-4 py-3.5 font-bold text-brand">{formatKES(c.savings)}</td>
                      <td className="px-4 py-3.5 font-bold text-ink">{c.activeLoans}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {data && data.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No customers match your search</p>}
      </Card>
    </div>
  );
}


export default function AdminCustomers() {
  return (
    <AdminLayout>
      <AdminCustomersBody />
    </AdminLayout>
  );
}
