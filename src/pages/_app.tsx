import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/ui/Toast";
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

  useEffect(() => {
    if (isAppRoute) {
      // Auth gate — the API returns 401 when the session is gone.
      fetch("/api/auth/me")
        .then((r) => {
          if (r.status === 401) router.replace("/login");
        })
        .catch(() => {});
    }
  }, [router.pathname, isAppRoute, router]);

  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, shouldRetryOnError: false }}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </SWRConfig>
  );
}
