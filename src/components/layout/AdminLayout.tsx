import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  ClipboardList,
  Leaf,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Settings2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/applications", label: "Applications", Icon: ClipboardList },
  { href: "/admin/withdrawals", label: "Withdrawals", Icon: Banknote },
  { href: "/admin/loans", label: "Loans", Icon: Wallet },
  { href: "/admin/products", label: "Loan Products", Icon: Package },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/audit", label: "Audit Log", Icon: ScrollText },
  { href: "/admin/settings", label: "Settings", Icon: Settings2 },
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col bg-brand-deep">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient">
          <Leaf size={20} className="text-white" />
        </div>
        <div>
          <p className="text-base font-extrabold tracking-tight text-white">OKOAHELA</p>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-mid">Admin</p>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map(({ href, label, Icon, exact }) => {
          const active = isActive(router.pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
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
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [router.asPath]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-deep text-white"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
            <Leaf size={14} className="text-white" />
          </div>
          <p className="text-sm font-extrabold tracking-tight text-ink">
            OKOAHELA <span className="text-brand">Admin</span>
          </p>
        </div>
      </header>

      {/* Mobile drawer sidebar */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-float"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-3xl px-5 py-5 lg:max-w-5xl lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
