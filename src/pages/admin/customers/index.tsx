import useSWR from "swr";
import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  MoreHorizontal,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Sheet from "@/components/ui/Sheet";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { formatKES } from "@/utils/format";
import { formatPhoneDisplay } from "@/lib/validation/schemas";

type Panel = "menu" | "savings" | "suspend" | "delete";

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
  const { show } = useToast();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data, mutate } = useSWR<Customer[]>(
    `/api/admin/customers?q=${encodeURIComponent(query)}`,
  );

  const [target, setTarget] = useState<Customer | null>(null);
  const [panel, setPanel] = useState<Panel>("menu");
  const [busy, setBusy] = useState(false);

  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const openMenu = (c: Customer) => {
    setTarget(c);
    setPanel("menu");
    setDirection("CREDIT");
    setAmount("");
    setNote("");
    setConfirmName("");
  };

  const close = () => setTarget(null);

  const submitSavings = async () => {
    if (!target) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      show("Enter an amount greater than zero", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ balance: number; message?: string }>(
        `/api/admin/customers/${target.id}/savings`,
        { direction, amount: value, note: note.trim() || undefined },
      );
      show(res.message ?? `Savings updated — new balance ${formatKES(res.balance)}`, "success");
      close();
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not adjust savings", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async () => {
    if (!target) return;
    const suspending = target.status !== "SUSPENDED";
    setBusy(true);
    try {
      await api.patch(`/api/admin/customers/${target.id}`, {
        status: suspending ? "SUSPENDED" : "ACTIVE",
      });
      show(suspending ? "Customer suspended" : "Customer reactivated", "success");
      close();
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update customer", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteCustomer = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/customers/${target.id}`);
      show("Customer deleted", "success");
      close();
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete customer", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">KYC</th>
                <th className="px-4 py-3.5">Loan limit</th>
                <th className="px-4 py-3.5">Savings</th>
                <th className="px-4 py-3.5">Active loans</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!data
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-5 py-4">
                        <div className="h-6 animate-pulse rounded-xl bg-gray-100" />
                      </td>
                    </tr>
                  ))
                : data.map((c) => (
                    <tr key={c.id} className="transition hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-ink">{c.fullName}</p>
                        <p className="text-xs text-gray-400">{formatPhoneDisplay(c.phone)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={c.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={c.kycStatus === "VERIFIED" ? "VERIFIED" : "PENDING"} />
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-ink">
                        {formatKES(c.loanLimit)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-brand">{formatKES(c.savings)}</td>
                      <td className="px-4 py-3.5 font-bold text-ink">{c.activeLoans}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          aria-label={`Manage ${c.fullName}`}
                          onClick={() => openMenu(c)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-brand/40 hover:text-brand"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {data && data.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No customers match your search</p>
        )}
      </Card>

      {/* Manage customer sheet */}
      <Sheet
        open={!!target}
        onClose={close}
        title={panel === "menu" ? target?.fullName ?? "Customer" : undefined}
      >
        <div className="space-y-4 p-5">
          {target && panel !== "menu" && (
            <button
              type="button"
              onClick={() => setPanel("menu")}
              className="text-xs font-bold text-brand"
            >
              ← Back
            </button>
          )}

          {panel === "menu" && target && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                {formatPhoneDisplay(target.phone)} · Savings {formatKES(target.savings)}
              </p>
              <button
                type="button"
                onClick={() => setPanel("savings")}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:border-brand/40"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ArrowUpCircle size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">Adjust savings</span>
                  <span className="block text-xs text-gray-400">
                    Add to or deduct from their savings balance
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPanel("suspend")}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:border-amber-300"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <UserCog size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">
                    {target.status === "SUSPENDED" ? "Reactivate account" : "Suspend account"}
                  </span>
                  <span className="block text-xs text-gray-400">
                    {target.status === "SUSPENDED"
                      ? "Restore access for this customer"
                      : "Block login and force logout"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPanel("delete")}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:border-red-300"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-red-600">Delete customer</span>
                  <span className="block text-xs text-gray-400">
                    Permanently remove account and history
                  </span>
                </span>
              </button>
            </div>
          )}

          {panel === "savings" && target && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("CREDIT")}
                  className={`rounded-2xl border p-3.5 text-center transition ${
                    direction === "CREDIT"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <ArrowUpCircle
                    size={18}
                    className={`mx-auto ${direction === "CREDIT" ? "text-emerald-600" : "text-gray-400"}`}
                  />
                  <span className="mt-1 block text-sm font-bold text-ink">Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("DEBIT")}
                  className={`rounded-2xl border p-3.5 text-center transition ${
                    direction === "DEBIT" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <ArrowDownCircle
                    size={18}
                    className={`mx-auto ${direction === "DEBIT" ? "text-red-600" : "text-gray-400"}`}
                  />
                  <span className="mt-1 block text-sm font-bold text-ink">Subtract</span>
                </button>
              </div>
              <Input
                name="adj-amount"
                label="Amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                suffix={<span className="text-xs font-semibold text-muted">KES</span>}
                hint={`Current balance: ${formatKES(target.savings)}`}
              />
              <Input
                name="adj-note"
                label="Reason (optional)"
                placeholder="e.g. M-Pesa reversal"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button fullWidth loading={busy} onClick={submitSavings}>
                Apply adjustment
              </Button>
            </>
          )}

          {panel === "suspend" && target && (
            <>
              <p className="text-sm text-body">
                {target.status === "SUSPENDED"
                  ? `${target.fullName} is currently suspended. Reactivating restores login and app access.`
                  : `Suspending ${target.fullName} blocks login immediately and signs out their active sessions. Loans and savings data are kept.`}
              </p>
              <Button
                fullWidth
                variant={target.status === "SUSPENDED" ? "primary" : "danger"}
                loading={busy}
                onClick={toggleSuspend}
              >
                {target.status === "SUSPENDED" ? "Reactivate account" : "Suspend account"}
              </Button>
            </>
          )}

          {panel === "delete" && target && (
            <>
              <p className="text-sm text-body">
                This permanently deletes{" "}
                <span className="font-bold text-ink">{target.fullName}</span> and all their records.
                Customers with active loans, pending applications or pending withdrawals cannot be
                deleted.
              </p>
              <Input
                name="del-confirm"
                label="Type the customer's full name to confirm"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={target.fullName}
              />
              <Button
                fullWidth
                variant="danger"
                loading={busy}
                disabled={confirmName.trim().toLowerCase() !== target.fullName.trim().toLowerCase()}
                onClick={deleteCustomer}
              >
                Delete permanently
              </Button>
            </>
          )}
        </div>
      </Sheet>
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
