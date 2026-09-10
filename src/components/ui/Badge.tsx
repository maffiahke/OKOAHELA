interface Props {
  status: string;
  className?: string;
}

const MAP: Record<string, string> = {
  SUCCESS: "bg-brand-soft text-brand-dark",
  SUCCESSFUL: "bg-brand-soft text-brand-dark",
  ACTIVE: "bg-brand-soft text-brand-dark",
  APPROVED: "bg-brand-soft text-brand-dark",
  VERIFIED: "bg-brand-soft text-brand-dark",
  DISBURSED: "bg-brand-soft text-brand-dark",
  PAID: "bg-brand-soft text-brand-dark",
  FULLY_REPAID: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-600",
  REJECTED: "bg-red-100 text-red-600",
  FAILED: "bg-red-100 text-red-600",
  SUSPENDED: "bg-red-100 text-red-600",
  DEFAULTED: "bg-red-100 text-red-600",
};

export default function Badge({ status, className = "" }: Props) {
  const cls = MAP[status] ?? "bg-gray-100 text-gray-600";
  const label = status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${cls} ${className}`}>
      {label}
    </span>
  );
}
