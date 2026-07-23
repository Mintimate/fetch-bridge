import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  // OpenNext patches Prisma's workerd export and includes its query compiler
  // WASM only when both packages remain external to Next.js' server bundle.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;

// Exposes local D1 bindings while developing with `next dev`.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
