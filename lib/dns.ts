import { resolve4, resolve6 } from "node:dns/promises";

import { isIP, isPrivateAddress, normalizeAddress } from "@/lib/relay-core";

type DnsResolver = {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
};

const systemDnsResolver: DnsResolver = { resolve4, resolve6 };

/** Resolve on every request so DNS rebinding cannot redirect a configured host to a private address. */
export async function assertPublicDns(
  url: URL,
  resolver: DnsResolver = systemDnsResolver,
) {
  const hostname = normalizeAddress(url.hostname);
  const addresses = isIP(hostname)
    ? [hostname]
    : (
        await Promise.allSettled([
          resolver.resolve4(hostname),
          resolver.resolve6(hostname),
        ])
      )
        .filter(
          (result): result is PromiseFulfilledResult<string[]> =>
            result.status === "fulfilled",
        )
        .flatMap((result) => result.value);

  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error("Source hostname resolves to a local or private address");
  }
}
