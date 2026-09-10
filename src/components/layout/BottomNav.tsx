import { useRouter } from "next/router";
import { Home, PiggyBank, ReceiptText, UserRound, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/loans", label: "Loans", Icon: Wallet },
  { href: "/savings", label: "Savings", Icon: PiggyBank },
  { href: "/transactions", label: "Transactions", Icon: ReceiptText },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export default function BottomNav() {
  const router = useRouter();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {items.map(({ href, label, Icon }) => {
          const active = router.pathname === href || (href !== "/dashboard" && router.pathname.startsWith(href));
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              aria-label={label}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute -top-px h-1 w-8 rounded-full bg-brand"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-brand" : "text-gray-400"} />
              <span className={`text-[10px] font-bold ${active ? "text-brand" : "text-gray-400"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
