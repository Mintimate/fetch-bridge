import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (
        nextUrl.pathname === "/login" ||
        nextUrl.pathname.startsWith("/download/") ||
        nextUrl.pathname.startsWith("/api/auth")
      )
        return true;
      return Boolean(auth);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
