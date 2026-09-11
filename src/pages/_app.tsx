import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/ui/Toast";
import BottomNav from "@/components/layout/BottomNav";
import { handleAuthExpiry } from "@/lib/client/api";
import "@/styles/globals.css";

// Keep in sync with SESSION_IDLE_MINUTES on the server (src/lib/auth/session.ts).
const IDLE_LOGOUT_MS = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES ?? 30) * 60_000;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    handleAuthExpiry(res.status, json?.error?.code);
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
  const lastActivity = useRef(Date.now());

  // Client-side idle auto-logout: matches the server's sliding window so the
  // user is signed out even if they just leave the tab open untouched.
  useEffect(() => {
    if (!isAppRoute) return;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_LOGOUT_MS) {
        clearInterval(timer);
        void fetch("/api/auth/me", { method: "DELETE" }).finally(() => {
          window.sessionStorage.setItem("okohela_session_expired", "1");
          router.replace("/login?expired=1");
        });
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(timer);
    };
  }, [isAppRoute, router]);

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
          const json = await r.json().catch(() => null);
          if (json?.error?.code === "UNAUTHENTICATED") {
            window.sessionStorage.setItem("okohela_session_expired", "1");
            router.replace("/login?expired=1");
            return;
          }
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
        <Head>
          <title>OKOAHELA</title>
          <meta name="description" content="Save with M-Pesa. Borrow up to 2x your savings." />
        </Head>
        <Component {...pageProps} />
        {isAppRoute && !isAdminRoute && role !== "ADMIN" && <BottomNav />}
      </ToastProvider>
    </SWRConfig>
  );
}
