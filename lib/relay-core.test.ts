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
    "if-match": '"abc"',
  });
  const headers = buildUpstreamHeaders(
    JSON.stringify({
      Accept: "application/octet-stream",
      Authorization: "blocked",
      "CF-Connecting-IP": "blocked",
      "X-Forwarded-For": "blocked",
    }),
    "Fetch Bridge",
    requestHeaders,
  );

  assert.equal(headers.get("accept"), "application/octet-stream");
  assert.equal(headers.get("authorization"), null);
  assert.equal(headers.get("cf-connecting-ip"), null);
  assert.equal(headers.get("x-forwarded-for"), null);
  assert.equal(headers.get("range"), "bytes=0-99");
  assert.equal(headers.get("if-match"), '"abc"');
  assert.equal(headers.get("user-agent"), "Fetch Bridge");
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
  await assertPublicDns(new URL("https://example.com"));

  for (const host of [
    "localhost",
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "this-host-does-not-exist.invalid",
    "private-name.localhost",
  ]) {
    await assert.rejects(
      () => assertPublicDns(new URL(`https://${host}`)),
      /local or private address/,
      host,
    );
  }
});
