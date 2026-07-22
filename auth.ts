import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import authConfig from "@/auth.config";

function environmentValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "").replaceAll("\\$", "$");
}

function passwordsEqual(input: string, configured: string) {
  const inputBuffer = Buffer.from(input);
  const configuredBuffer = Buffer.from(configured);
  return inputBuffer.length === configuredBuffer.length && timingSafeEqual(inputBuffer, configuredBuffer);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    name: "Administrator",
    credentials: { email: {}, password: {} },
    authorize: async (credentials) => {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(credentials);
      if (!parsed.success) return null;
      const email = environmentValue(process.env.ADMIN_EMAIL);
      const password = environmentValue(process.env.ADMIN_PASSWORD);
      const emailMatches = Boolean(email && parsed.data.email.trim().toLowerCase() === email.toLowerCase());
      const passwordMatches = Boolean(password && passwordsEqual(parsed.data.password, password));
      if (!emailMatches || !passwordMatches) {
        // eslint-disable-next-line no-console -- safe diagnostics without values for deployment troubleshooting.
        console.warn("[auth] Administrator login rejected", { emailConfigured: Boolean(email), emailMatches, passwordConfigured: Boolean(password), passwordMatches });
        return null;
      }
      return { id: "administrator", email, name: "Administrator" };
    },
  })],
  session: { strategy: "jwt" },
});
