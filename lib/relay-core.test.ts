import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicDns } from "./dns";
import {
  assertSafeSourceUrl,
  buildUpstreamHeaders,
  isPrivateAddress,
  resolveUpstreamUrl,
  responseContentLength,
  sourceTimeout,
} from "./relay-core";
import { fetchUpstream } from "./upstream";

test("rejects local and private source addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "100.64.1.2",
    "169.254.1.2",
    "172.16.1.2",
    "192.168.1.2",
    "198.18.1.2",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }

  assert.throws(() => assertSafeSourceUrl("http://example.com"));
  assert.throws(() => assertSafeSourceUrl("https://localhost/file"));
  assert.throws(() => assertSafeSourceUrl("https://user:pass@example.com"));
  assert.equal(
    assertSafeSourceUrl("https://example.com/pub/").hostname,
    "example.com",
  );
});

test("maps a matched route without allowing target-path escape", () => {
  const base = new URL("https://example.com/");
  assert.equal(
    resolveUpstreamUrl(
      base,
      "/pub/fenix",
      "/firefox",
      "/firefox/releases/file.apk",
    ).toString(),
    "https://example.com/pub/fenix/releases/file.apk",
  );

  assert.throws(() =>
    resolveUpstreamUrl(base, "/pub/fenix", "/firefox", "/other/file.apk"),
  );
  assert.throws(() =>
    resolveUpstreamUrl(
      base,
      "/pub/../private",
      "/firefox",
      "/firefox/file.apk",
    ),
  );
});

test("forwards only safe configured and conditional headers", () => {
  const requestHeaders = new Headers({
    range: "bytes=0-99",
    "if-range": '"version-1"',
    "if-match": '"abc"',
  });
  const headers = buildUpstreamHeaders(
    JSON.stringify({
      Accept: "application/octet-stream",
      "Accept-Encoding": "gzip",
      Authorization: "blocked",
      "CF-Connecting-IP": "blocked",
      "X-Forwarded-For": "blocked",
    }),
    "Fetch Bridge",
    requestHeaders,
  );

  assert.equal(headers.get("accept"), "application/octet-stream");
  assert.equal(headers.get("accept-encoding"), "identity");
  assert.equal(headers.get("authorization"), null);
  assert.equal(headers.get("cf-connecting-ip"), null);
  assert.equal(headers.get("x-forwarded-for"), null);
  assert.equal(headers.get("range"), "bytes=0-99");
  assert.equal(headers.get("if-range"), '"version-1"');
  assert.equal(headers.get("if-match"), '"abc"');
  assert.equal(headers.get("user-agent"), "Fetch Bridge");
});

test("follows redirects without leaking configured headers across origins", async () => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const responses = [
    new Response(null, {
      status: 302,
      headers: { location: "/release/file.exe" },
    }),
    new Response(null, {
      status: 307,
      headers: { location: "https://cdn.example.net/file.exe" },
    }),
    new Response(new Uint8Array([0, 1, 2, 253, 254, 255]), {
      status: 200,
      headers: {
        "content-length": "6",
        "content-type": "application/octet-stream",
      },
    }),
  ];
  const validated: string[] = [];

  const result = await fetchUpstream({
    target: new URL("https://downloads.example.com/file.exe"),
    method: "GET",
    configuredHeadersJson: JSON.stringify({
      "X-Api-Key": "secret",
      Accept: "application/octet-stream",
    }),
    userAgent: "Fetch Bridge",
    requestHeaders: new Headers({
      Range: "bytes=100-",
      "If-Range": '"version-1"',
    }),
    signal: new AbortController().signal,
    fetcher: async (input, init) => {
      calls.push({
        url: input.toString(),
        headers: new Headers(init?.headers),
      });
      const response = responses.shift();
      assert.ok(response);
      return response;
    },
    validateUrl: async (url) => {
      validated.push(url.toString());
    },
  });

  assert.equal(result.finalUrl.toString(), "https://cdn.example.net/file.exe");
  assert.equal(result.redirectCount, 2);
  assert.deepEqual(validated, [
    "https://downloads.example.com/release/file.exe",
    "https://cdn.example.net/file.exe",
  ]);
  assert.equal(calls[0]?.headers.get("x-api-key"), "secret");
  assert.equal(calls[1]?.headers.get("x-api-key"), "secret");
  assert.equal(calls[2]?.headers.get("x-api-key"), null);
  assert.equal(calls[2]?.headers.get("accept"), null);
  assert.equal(calls[2]?.headers.get("accept-encoding"), "identity");
  assert.equal(calls[2]?.headers.get("range"), "bytes=100-");
  assert.equal(calls[2]?.headers.get("if-range"), '"version-1"');
  assert.deepEqual(
    new Uint8Array(await result.response.arrayBuffer()),
    new Uint8Array([0, 1, 2, 253, 254, 255]),
  );
});

test("rejects unsafe redirects and redirect loops", async () => {
  await assert.rejects(
    () =>
      fetchUpstream({
        target: new URL("https://downloads.example.com/file.exe"),
        method: "GET",
        configuredHeadersJson: "{}",
        userAgent: null,
        requestHeaders: new Headers(),
        signal: new AbortController().signal,
        fetcher: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "http://127.0.0.1/private" },
          }),
        validateUrl: async () => {
          throw new Error("must not be reached");
        },
      }),
    /unsafe URL/,
  );

  await assert.rejects(
    () =>
      fetchUpstream({
        target: new URL("https://downloads.example.com/file.exe"),
        method: "HEAD",
        configuredHeadersJson: "{}",
        userAgent: null,
        requestHeaders: new Headers(),
        signal: new AbortController().signal,
        maxRedirects: 1,
        fetcher: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "/loop" },
          }),
        validateUrl: async () => {},
      }),
    /exceeded 1 redirects/,
  );
});

test("normalizes untrusted timeout and content-length values", () => {
  assert.equal(sourceTimeout(Number.NaN), 30_000);
  assert.equal(sourceTimeout(10), 1_000);
  assert.equal(sourceTimeout(999_999), 120_000);

  assert.equal(
    responseContentLength(new Headers({ "content-length": "42" })),
    42,
  );
  assert.equal(
    responseContentLength(new Headers({ "content-length": "invalid" })),
    0,
  );
});

test("assertPublicDns accepts public hosts and rejects private or unresolvable ones", async () => {
  const publicResolver = {
    resolve4: async () => ["93.184.216.34"],
    resolve6: async () => ["2606:2800:220:1:248:1893:25c8:1946"],
  };
  await assertPublicDns(new URL("https://example.com"), publicResolver);

  for (const host of ["127.0.0.1", "10.0.0.1", "192.168.1.1"]) {
    await assert.rejects(
      () => assertPublicDns(new URL(`https://${host}`), publicResolver),
      /local or private address/,
      host,
    );
  }

  await assert.rejects(
    () =>
      assertPublicDns(new URL("https://private-name.example"), {
        resolve4: async () => ["192.168.1.10"],
        resolve6: async () => [],
      }),
    /local or private address/,
  );
  await assert.rejects(
    () =>
      assertPublicDns(new URL("https://unresolvable.example"), {
        resolve4: async () => {
          throw new Error("not found");
        },
        resolve6: async () => {
          throw new Error("not found");
        },
      }),
    /local or private address/,
  );
});
