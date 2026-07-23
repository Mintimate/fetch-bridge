import { resolve4, resolve6 } from "node:dns/promises";

import { isIP, isPrivateAddress, normalizeAddress } from "@/lib/relay-core";

/** Resolve on every request so DNS rebinding cannot redirect a configured host to a private address. */
export async function assertPublicDns(url: URL) {
  const hostname = normalizeAddress(url.hostname);
  const addresses = isIP(hostname)
    ? [hostname]
    : (
        await Promise.allSettled([resolve4(hostname), resolve6(hostname)])
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
