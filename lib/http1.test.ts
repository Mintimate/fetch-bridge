import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHttp1Request,
  decodeHttp1Body,
  findHttp1HeaderEnd,
  isByteRangeResponseCoherent,
  isIdentitySocketCandidate,
  parseHttp1ResponseHead,
} from "./http1";

test("considers every HTTPS Range request for byte-exact transport", () => {
  assert.equal(
    isIdentitySocketCandidate(
      new URL("https://downloads.example.com/releases/file.exe"),
      new Headers({ range: "bytes=0-99" }),
    ),
    true,
  );
  assert.equal(
    isIdentitySocketCandidate(
      new URL("https://cdn.mozilla.net/file.tar"),
      new Headers(),
    ),
    false,
  );
  assert.equal(
    isIdentitySocketCandidate(
      new URL("http://downloads.example.com/file.exe"),
      new Headers({ range: "bytes=0-99" }),
    ),
    false,
  );
});

test("detects a transformed or incomplete byte-range response", () => {
  assert.equal(
    isByteRangeResponseCoherent(
      "bytes=0-1048575",
      206,
      new Headers({
        "content-length": "1048576",
        "content-range": "bytes 0-1048575/400952232",
      }),
    ),
    true,
  );
  assert.equal(
    isByteRangeResponseCoherent(
      "bytes=0-1048575",
      206,
      new Headers({
        "content-range": "bytes 0-1048575/205648570",
        "x-identity-content-length": "400952232",
      }),
    ),
    false,
  );
  assert.equal(
    isByteRangeResponseCoherent(
      "bytes=100-199",
      206,
      new Headers({
        "content-length": "100",
        "content-range": "bytes 0-99/1000",
      }),
    ),
    false,
  );
  assert.equal(
    isByteRangeResponseCoherent(
      "bytes=0-99",
      206,
      new Headers({
        "content-length": "100",
        "content-range": "bytes 0-99/1000",
      }),
    ),
    true,
  );
  assert.equal(
    isByteRangeResponseCoherent(
      "bytes=0-99",
      206,
      new Headers({
        "content-encoding": "gzip",
        "content-length": "100",
        "content-range": "bytes 0-99/1000",
      }),
    ),
    false,
  );
});

test("builds an identity HTTP/1.1 range request", () => {
  const request = buildHttp1Request(
    new URL("https://downloads.example.com:8443/releases/file.exe?download=1"),
    "GET",
    new Headers({
      "accept-encoding": "gzip",
      range: "bytes=0-1048575",
    }),
  );
  const text = new TextDecoder().decode(request);

  assert.match(text, /^GET \/releases\/file\.exe\?download=1 HTTP\/1\.1\r\n/);
  assert.match(text, /\r\naccept-encoding: identity\r\n/);
  assert.match(text, /\r\nrange: bytes=0-1048575\r\n/);
  assert.match(text, /\r\nhost: downloads\.example\.com:8443\r\n/);
  assert.match(text, /\r\nconnection: close\r\n/);
  assert.match(text, /\r\n\r\n$/);
});

test("parses response headers and preserves the first body bytes", () => {
  const response = new TextEncoder().encode(
    [
      "HTTP/1.1 206 Partial Content",
      "Content-Length: 4",
      "Content-Range: bytes 0-3/400952232",
      "",
      "body",
    ].join("\r\n"),
  );
  const parsed = parseHttp1ResponseHead(response);

  assert.equal(parsed.status, 206);
  assert.equal(parsed.statusText, "Partial Content");
  assert.equal(parsed.headers.get("content-length"), "4");
  assert.equal(parsed.headers.get("content-range"), "bytes 0-3/400952232");
  assert.equal(
    new TextDecoder().decode(response.subarray(parsed.bodyOffset)),
    "body",
  );
  assert.equal(findHttp1HeaderEnd(response), parsed.bodyOffset - 4);
});

test("rejects malformed or unsupported response heads", () => {
  assert.throws(
    () => parseHttp1ResponseHead(new TextEncoder().encode("HTTP/1.1 200 OK")),
    /incomplete/,
  );
  assert.equal(
    parseHttp1ResponseHead(
      new TextEncoder().encode("HTTP/1.1 103 Early Hints\r\n\r\n"),
    ).status,
    103,
  );
  assert.throws(
    () =>
      parseHttp1ResponseHead(new TextEncoder().encode("HTTP/2 200 OK\r\n\r\n")),
    /status line/,
  );
});

async function decodedBody(raw: string, headers: Headers) {
  const chunks = [
    new TextEncoder().encode(raw.slice(0, 5)),
    new TextEncoder().encode(raw.slice(5, 13)),
    new TextEncoder().encode(raw.slice(13)),
  ];
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
  });
  const reader = stream.getReader();
  const output: Uint8Array[] = [];
  for await (const chunk of decodeHttp1Body(
    reader,
    new Uint8Array(),
    headers,
  )) {
    output.push(chunk);
  }
  const size = output.reduce((total, chunk) => total + chunk.length, 0);
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of output) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combined);
}

test("decodes content-length, chunked, and connection-close bodies", async () => {
  assert.equal(
    await decodedBody("hello ignored", new Headers({ "content-length": "5" })),
    "hello",
  );
  assert.equal(
    await decodedBody(
      "4\r\nWiki\r\n5;name=value\r\npedia\r\n0\r\nX-Checksum: ok\r\n\r\n",
      new Headers({ "transfer-encoding": "chunked" }),
    ),
    "Wikipedia",
  );
  assert.equal(await decodedBody("until close", new Headers()), "until close");
});

test("rejects truncated and malformed HTTP/1.1 body framing", async () => {
  await assert.rejects(
    () => decodedBody("short", new Headers({ "content-length": "10" })),
    /Content-Length/,
  );
  await assert.rejects(
    () =>
      decodedBody(
        "not-hex\r\nbody\r\n0\r\n\r\n",
        new Headers({ "transfer-encoding": "chunked" }),
      ),
    /chunk size/,
  );
});
