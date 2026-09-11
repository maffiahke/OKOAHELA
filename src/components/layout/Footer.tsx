import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

const DISCLOSURES: { title: string; body: React.ReactNode }[] = [
  {
    title: "Corporate Identity",
    body: (
      <>
        <span className="font-bold text-white">Biashara Loans</span> is a registered brand operated
        by <span className="font-bold text-white">Biashara Loans Kenya Limited</span>, a private
        limited company incorporated under the Companies Act, 2015 of the Laws of Kenya (Company
        Registration No. PVT-L7UQ6A2).
      </>
    ),
  },
  {
    title: "Data Protection Compliance",
    body: (
      <>
        Fully registered as a Data Controller with the Office of the Data Protection Commissioner
        (ODPC) of Kenya, in strict compliance with the Data Protection Act, 2019 (Certificate No.
        ODPC/REG/2026/0718). Your personal data, National ID, and registration details are
        encrypted, securely transmitted, and never shared with unauthorized third parties.
      </>
    ),
  },
  {
    title: "CBK Licensing Status",
    body: (
      <>
        In accordance with the Central Bank of Kenya (Amendment) Act, 2021 and the Central Bank of
        Kenya (Digital Credit Providers) Regulations, 2022, Biashara Loans Kenya Limited has
        submitted its application for licensing as a Digital Credit Provider (DCP). The license
        application is currently in process and under review with the Central Bank of Kenya (CBK).
      </>
    ),
  },
  {
    title: "Registered Office",
    body: (
      <>
        Landmark Plaza, 3rd Floor, Argwings Kodhek Road, Kilimani, Nairobi, Kenya.
      </>
    ),
  },
];

function DisclosureItem({
  title,
  body,
  open,
  onToggle,
}: {
  title: string;
  body: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-2.5 text-left"
      >
        <span className="text-[12px] font-bold text-white/90">{title}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-yellow-300/80 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-3 text-[11px] leading-relaxed text-white/60">{body}</p>
      )}
    </div>
  );
}

export default function Footer() {
  // Registered Office is short — expanded by default; the rest collapse.
  const [open, setOpen] = useState<Record<string, boolean>>({ "Registered Office": true });

  return (
    <footer className="relative mt-10 w-full overflow-hidden bg-brand-deep text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-home-radial opacity-90"
      />
      <div className="relative mx-auto w-full max-w-md px-6 py-8 lg:max-w-3xl">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-yellow-300" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-yellow-300">
            Regulatory &amp; Compliance Disclosures
          </p>
        </div>

        <div className="mt-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
          {DISCLOSURES.map((d) => (
            <DisclosureItem
              key={d.title}
              title={d.title}
              body={d.body}
              open={!!open[d.title]}
              onToggle={() => setOpen((prev) => ({ ...prev, [d.title]: !prev[d.title] }))}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] font-medium text-white/50">
          &copy; {new Date().getFullYear()} Biashara Loans Kenya Limited. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
