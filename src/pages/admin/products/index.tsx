import { useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Sheet from "@/components/ui/Sheet";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import useSWR from "swr";
import {
  Check,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  feeRate: number;
  periodMonths: number;
  periodOptions: number[];
  badge: string | null;
  sortOrder: number;
  active: boolean;
  usage: number;
}

interface FormState {
  name: string;
  description: string;
  amount: string;
  feePercent: string;
  periods: string;
  badge: string;
  sortOrder: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  amount: "",
  feePercent: "10",
  periods: "1,2,3",
  badge: "",
  sortOrder: "",
  active: true,
};

function money(n: number) {
  return `KES ${Number(n).toLocaleString("en-KE")}`;
}

function ProductsBody() {
  const { show } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, mutate } = useSWR<Product[]>("/api/admin/products", (path: string) =>
    api.get<Product[]>(path),
  );

  const products = useMemo(() => data ?? [], [data]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      amount: String(p.amount),
      feePercent: String(Math.round(p.feeRate * 10000) / 100),
      periods: p.periodOptions.join(","),
      badge: p.badge ?? "",
      sortOrder: String(p.sortOrder),
      active: p.active,
    });
    setSheetOpen(true);
  };

  const save = async () => {
    const parsedPeriods = form.periods
      .split(/[, ]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      feeRate: Number(form.feePercent) / 100,
      periodOptions: parsedPeriods,
      periodMonths: parsedPeriods[0],
      badge: form.badge.trim(),
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : undefined,
      active: form.active,
    };
    if (!body.name || !body.amount || !body.periodOptions.length) {
      show("Name, amount and at least one period are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/products/${editing.id}`, body);
        show("Product updated", "success");
      } else {
        await api.post("/api/admin/products", body);
        show("Product created", "success");
      }
      setSheetOpen(false);
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save product", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await api.patch(`/api/admin/products/${p.id}`, { active: !p.active });
      show(p.active ? "Product deactivated" : "Product activated", "success");
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update product", "error");
    }
  };

  const removeProduct = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.del<{ message?: string }>(`/api/admin/products/${deleteTarget.id}`);
      show(res?.message ?? "Product deleted", "success");
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete product", "error");
    } finally {
      setDeleting(false);
    }
  };

  const field = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink">Loan Products</h1>
          <p className="mt-1 text-sm text-muted">
            Products shown to customers when applying for loans.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> Add product
          </span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 text-muted">
          <Loader2 size={18} className="animate-spin" /> Loading products…
        </div>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand">
            <Package size={26} />
          </span>
          <p className="font-bold text-ink">No loan products yet</p>
          <p className="text-sm text-muted">
            Create your first product so customers can apply for loans.
          </p>
          <Button size="sm" onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={15} /> Add product
            </span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {products.map((p) => {
            const usage = p.usage ?? 0;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-bold text-ink">{p.name}</h3>
                      <Badge status={p.active ? "ACTIVE" : "REJECTED"} />
                      {p.badge ? (
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold tracking-wide text-violet-700">
                          {p.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">
                      {p.description || "No description"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-gray-50 py-2">
                    <p className="text-[13px] font-extrabold text-ink">{money(p.amount)}</p>
                    <p className="text-[10px] text-light">Amount</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 py-2">
                    <p className="text-[13px] font-extrabold text-ink">{Math.round(p.feeRate * 10000) / 100}%</p>
                    <p className="text-[10px] text-light">Fee</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 py-2">
                    <p className="text-[13px] font-extrabold text-ink">
                      {p.periodOptions.map((d) => `${d}m`).join(" · ")}
                    </p>
                    <p className="text-[10px] text-light">Periods</p>
                  </div>
                </div>
                {usage > 0 && (
                  <p className="mt-2 text-[11px] text-light">
                    Used by {usage} loan{usage === 1 ? "" : "s"}/application{usage === 1 ? "" : "s"}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                    <span className="flex items-center gap-1.5">
                      <Pencil size={14} /> Edit
                    </span>
                  </Button>
                  <Button
                    variant={p.active ? "ghost" : "primary"}
                    size="sm"
                    onClick={() => toggleActive(p)}
                  >
                    <span className="flex items-center gap-1.5">
                      {p.active ? <X size={14} /> : <Check size={14} />}
                      {p.active ? "Deactivate" : "Activate"}
                    </span>
                  </Button>
                  <button
                    type="button"
                    aria-label="Delete product"
                    onClick={() => setDeleteTarget(p)}
                    className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / edit sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit product" : "New loan product"}
      >
        <div className="space-y-4 p-5">
          <Input
            name="p-name"
            label="Product name"
            placeholder="e.g. Growth Loan"
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
          />
          <Input
            name="p-desc"
            label="Description"
            placeholder="Short pitch shown to customers"
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="p-amount"
              label="Loan amount"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => field("amount", e.target.value)}
              suffix={<span className="text-xs font-semibold text-muted">KES</span>}
            />
            <Input
              name="p-fee"
              label="Upfront fee"
              type="number"
              min={0}
              max={100}
              value={form.feePercent}
              onChange={(e) => field("feePercent", e.target.value)}
              suffix={<span className="text-xs font-semibold text-muted">%</span>}
            />
          </div>
          <Input
            name="p-periods"
            label="Periods (months)"
            placeholder="1,2,3"
            value={form.periods}
            onChange={(e) => field("periods", e.target.value)}
            hint="Comma-separated, e.g. 1,2,3,6"
          />
          <Input
            name="p-badge"
            label="Label"
            placeholder="Popular"
            value={form.badge}
            onChange={(e) => field("badge", e.target.value)}
            hint="Badge on customer screen"
          />
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <p className="text-sm font-semibold text-ink">Active (visible to customers)</p>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => field("active", e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
          </div>
          <Button fullWidth loading={saving} onClick={save}>
            {editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </Sheet>

      {/* Delete confirm */}
      <Sheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete product"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-body">
            Delete <span className="font-bold text-ink">{deleteTarget?.name}</span>? Products in
            use will be deactivated instead of deleted.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={removeProduct}>
              Delete
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <AdminLayout>
      <ProductsBody />
    </AdminLayout>
  );
}
