import { useRouter } from "next/router";
import { Bell, HelpCircle, Home, LayoutDashboard, LogOut, PiggyBank, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";

const customerNav = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/loans", label: "Loans", Icon: Wallet },
  { href: "/savings", label: "Savings", Icon: PiggyBank },
  { href: "/transactions", label: "Transactions", Icon: ReceiptText },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/support", label: "Help & Support", Icon: HelpCircle },
];

const adminNav = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", Icon: ReceiptText },
  { href: "/admin/customers", label: "Customers", Icon: ShieldCheck },
  { href: "/admin/loans", label: "Loans", Icon: Wallet },
  { href: "/admin/audit", label: "Audit Logs", Icon: HelpCircle },
];

export default function Sidebar({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const nav = admin ? adminNav : customerNav;
  const { show } = useToast();

  const logout = async () => {
    try {
      await api.del("/api/auth/logout");
    } finally {
      show("You have been logged out", "success");
      router.replace("/login");
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-100 bg-white px-5 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white shadow-brand">
          O
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight text-ink">OKOAHELA</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">Pata Loan Haraka</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ href, label, Icon }) => {
          const active = router.pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active ? "bg-brand-soft text-brand-dark" : "text-gray-500 hover:bg-gray-50 hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={2.1} />
              {label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-red-50 hover:text-red-500"
      >
        <LogOut size={19} />
        Log out
      </button>
    </aside>
  );
}
