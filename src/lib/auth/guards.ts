import { NextApiRequest } from "next";
import { getSessionUserFromCookie, AuthUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";

export async function getSessionUser(req: NextApiRequest): Promise<AuthUser | null> {
  const cookieHeader = req.headers.cookie ?? null;
  return getSessionUserFromCookie(cookieHeader);
}

export async function requireUser(req: NextApiRequest): Promise<AuthUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new ApiError(401, "Your session has expired. Please log in again.", "UNAUTHENTICATED");
  }
  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "Your account has been suspended. Contact support.", "ACCOUNT_SUSPENDED");
  }
  return user;
}

export async function requireAdmin(req: NextApiRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required", "FORBIDDEN");
  }
  return user;
}
