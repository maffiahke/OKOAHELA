import { useEffect } from "react";
import { useRouter } from "next/router";
import { Home, PiggyBank, ReceiptText, UserRound, Wallet } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/loans", label: "Loans", Icon: Wallet },
  { href: "/savings", label: "Savings", Icon: PiggyBank },
  { href: "/transactions", label: "Transactions", Icon: ReceiptText },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export default function BottomNav() {
  const router = useRouter();
  // Reserve scroll space so the fixed nav never covers page content.
  useEffect(() => {
    document.documentElement.classList.add("has-bottom-nav");
    return () => document.documentElement.classList.remove("has-bottom-nav");
  }, []);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between rounded-2xl bg-brand-deep px-1 py-1.5 shadow-float mx-4">
        {items.map(({ href, label, Icon }) => {
          const active = router.pathname === href || (href !== "/dashboard" && router.pathname.startsWith(href));
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
              aria-label={label}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-brand-mid" : "text-white/55"}
              />
              <span className={`text-[10px] font-bold ${active ? "text-brand-mid" : "text-white/55"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
