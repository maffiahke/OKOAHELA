import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/ui/Toast";
import BottomNav from "@/components/layout/BottomNav";
import "@/styles/globals.css";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || !json.ok) {
    const err = new Error(json?.error?.message ?? "Request failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json.data;
};

export { fetcher };

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAppRoute = ["/dashboard", "/loans", "/savings", "/transactions", "/profile", "/notifications", "/support", "/admin"].some(
    (p) => router.pathname.startsWith(p),
  );
  const isAdminRoute = router.pathname.startsWith("/admin");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isAppRoute) {
      setRole(null);
      return;
    }
    let cancelled = false;
    // Auth gate — the API returns 401 when the session is gone.
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login");
          return;
        }
        const json = await r.json().catch(() => null);
        if (!cancelled) setRole(json?.data?.role ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router.pathname, isAppRoute, router]);

  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, shouldRetryOnError: false }}>
      <ToastProvider>
        <Component {...pageProps} />
        {isAppRoute && !isAdminRoute && role !== "ADMIN" && <BottomNav />}
      </ToastProvider>
    </SWRConfig>
  );
}
