import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import {
  Banknote,
  ClipboardList,
  Leaf,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/applications", label: "Applications", Icon: ClipboardList },
  { href: "/admin/withdrawals", label: "Withdrawals", Icon: Banknote },
  { href: "/admin/loans", label: "Loans", Icon: Wallet },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/audit", label: "Audit Log", Icon: ScrollText },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

const logout = async () => {
  try {
    await api.del("/api/auth/logout");
  } finally {
    window.location.href = "/login";
  }
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-deep lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight text-white">OKOAHELA</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-mid">Admin</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(router.pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  active ? "bg-brand text-white shadow-brand" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile section tabs */}
      <div className="sticky top-0 z-30 -mx-0 border-b border-gray-100 bg-white/90 backdrop-blur lg:hidden">
        <nav className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(router.pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
                  active ? "bg-brand text-white shadow-brand" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-5 py-5 lg:ml-64 lg:mr-auto lg:max-w-5xl lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
