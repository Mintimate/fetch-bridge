import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (
        nextUrl.pathname === "/login" ||
        nextUrl.pathname.startsWith("/download/") ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname === "/admin" ||
        nextUrl.pathname.startsWith("/admin/")
      )
        return true;
      return Boolean(auth);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
