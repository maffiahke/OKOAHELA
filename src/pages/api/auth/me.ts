import { NextApiRequest, NextApiResponse } from "next";
import { withApi, ok } from "@/lib/api";
import { getSessionUserFromCookie, clearSessionCookieHeader } from "@/lib/auth/session";

// GET /api/auth/me — current session user (or null).
export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    if (req.method === "DELETE") {
      // Logout
      const user = await getSessionUserFromCookie(req.headers.cookie ?? null);
      if (user) {
        const { prisma } = await import("@/lib/db");
        const { readSessionToken, destroySession } = await import("@/lib/auth/session");
        const token = readSessionToken(req.headers.cookie ?? null);
        if (token) await destroySession(token);
      }
      res.setHeader("Set-Cookie", clearSessionCookieHeader(process.env.NODE_ENV === "production"));
      return ok(res, { loggedOut: true });
    }
    res.setHeader("Allow", "GET, DELETE");
    return ok(res, null, 405);
  }

  const user = await getSessionUserFromCookie(req.headers.cookie ?? null);
  ok(res, user);
});
