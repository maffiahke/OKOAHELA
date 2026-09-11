import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ChevronDown, MessageCircle, Phone, ShieldQuestion, Mail } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import { api } from "@/lib/client/api";

interface SupportInfo {
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  supportHours: string;
}

const FAQS = [
  {
    q: "How do I get a loan?",
    a: "Pick a loan package on the Loans page, choose your repayment period, and confirm. Amounts up to KES 20,000 are approved instantly and sent to your M-Pesa.",
  },
  {
    q: "How long does approval take?",
    a: "Loan packages up to KES 20,000 are auto-approved in seconds. Larger amounts are reviewed by our credit team, usually within a few hours during business days.",
  },
  {
    q: "How do I repay my loan?",
    a: "Open the loan from your dashboard, tap Repay Now, choose the amount, and enter your M-Pesa PIN in the STK push prompt. Your balance updates immediately after confirmation.",
  },
  {
    q: "What happens if I repay late?",
    a: "Late repayments may attract a penalty and can reduce your future loan limit. Repaying on time grows your limit — up to KES 50,000.",
  },
  {
    q: "How does saving work?",
    a: "Deposit any amount to your OKOAHELA savings wallet via M-Pesa. Your savings also boost your creditworthiness and future loan limit.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We use encrypted connections, and M-Pesa payments are processed by Safaricom's certified Daraja platform. We never store your M-Pesa PIN.",
  },
];

const FALLBACK: SupportInfo = {
  supportPhone: "+254700123456",
  supportWhatsapp: "254700123456",
  supportEmail: "support@okohela.co.ke",
  supportHours: "Mon–Sat, 8am–7pm EAT",
};

export default function Support() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);
  const [info, setInfo] = useState<SupportInfo>(FALLBACK);

  useEffect(() => {
    api
      .get<SupportInfo>("/api/settings")
      .then((s) => setInfo({ ...FALLBACK, ...s }))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-extrabold text-ink">Help & Support</h1>
      </div>

      {/* Contact hero */}
      <div className="rounded-[28px] bg-brand-gradient p-6 text-white shadow-brand">
        <ShieldQuestion size={28} />
        <h2 className="mt-3 text-xl font-extrabold">How can we help?</h2>
        <p className="mt-1 text-sm opacity-85">Our support team is available {info.supportHours}.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={`tel:${info.supportPhone}`} className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/25">
            <Phone size={15} /> Call us
          </a>
          <a href={`mailto:${info.supportEmail}`} className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/25">
            <Mail size={15} /> Email
          </a>
        </div>
      </div>

      {/* FAQs */}
      <Card padded={false}>
        <h2 className="px-5 pt-5 font-extrabold text-ink">Frequently asked questions</h2>
        <ul className="divide-y divide-gray-50 px-5 pb-2">
          {FAQS.map((f, i) => (
            <li key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 py-4 text-left">
                <span className="text-sm font-bold text-ink">{f.q}</span>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="-mt-1 pb-4 text-xs leading-relaxed text-gray-500">{f.a}</p>}
            </li>
          ))}
        </ul>
      </Card>

      <Button fullWidth variant="secondary" size="lg" onClick={() => router.push("/dashboard")}>
        <MessageCircle size={16} /> Back to app
      </Button>
    </div>
  );
}
