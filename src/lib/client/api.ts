export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// A 401 UNAUTHENTICATED anywhere in the app means the session lapsed (idle
// timeout, max lifetime or logout) — send the user back to login once.
export function handleAuthExpiry(status: number, code?: string): void {
  if (status !== 401 || code !== "UNAUTHENTICATED") return;
  if (typeof window === "undefined") return;
  const onAuthPage = ["/login", "/register", "/verify", "/forgot-password"].some((p) =>
    window.location.pathname.startsWith(p),
  );
  if (onAuthPage) return;
  window.sessionStorage.setItem("okohela_session_expired", "1");
  window.location.assign("/login?expired=1");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let json: {
    ok?: boolean;
    data?: T;
    error?: { message: string; code?: string; details?: Record<string, unknown> };
  } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || json.ok === false) {
    handleAuthExpiry(res.status, json?.error?.code);
    throw new ApiClientError(
      json?.error?.message ?? "Something went wrong",
      res.status,
      json?.error?.code,
      json?.error?.details,
    );
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
