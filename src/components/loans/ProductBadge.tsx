// Marketing label shown on loan products (Popular, Best Value, Recommended…).
const STYLES: Record<string, string> = {
  Recommended: "bg-brand-soft text-brand-dark",
  Popular: "bg-amber-100 text-amber-700",
  "Best Value": "bg-violet-100 text-violet-700",
  New: "bg-sky-100 text-sky-700",
  "Fast Track": "bg-rose-100 text-rose-700",
  "Max Limit": "bg-gray-800 text-white",
};

export default function ProductBadge({ label, className = "" }: { label: string; className?: string }) {
  const style = STYLES[label] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  );
}
