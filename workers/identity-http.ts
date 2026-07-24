import { connect } from "cloudflare:sockets";

import {
  buildHttp1Request,
  decodeHttp1Body,
  findHttp1HeaderEnd,
  parseHttp1ResponseHead,
} from "../lib/http1";
import { assertSafeSourceUrl } from "../lib/relay-core";

const MAX_RESPONSE_HEADER_BYTES = 64 * 1024;

function concatBytes(left: Uint8Array, right: Uint8Array) {
  const combined = new Uint8Array(left.length + right.length);
  combined.set(left);
  combined.set(right, left.length);
  return combined;
}

/**
 * Make a byte-exact HTTPS request without Cloudflare fetch() content negotiation.
 * Callers must DNS-validate the URL before using this transport.
 */
export async function fetchIdentityHttp1(
  input: string | URL | Request,
  init?: RequestInit,
) {
  const request = new Request(input, init);
  const url = assertSafeSourceUrl(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new Error("Raw identity transport only supports GET and HEAD");
  }
  if (request.signal.aborted) throw new Error("Upstream request was aborted");
  const port = url.port ? Number(url.port) : 443;
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || port === 25) {
    throw new Error("Unsupported upstream HTTPS port");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  const socket = connect(
    { hostname, port },
    { secureTransport: "on", allowHalfOpen: false },
  );
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    request.signal.removeEventListener("abort", abort);
    void socket.close().catch(() => {});
  };
  const abort = () => {
    cleanup();
  };
  request.signal.addEventListener("abort", abort, { once: true });

  try {
    await socket.opened;
    const writer = socket.writable.getWriter();
    await writer.write(
      buildHttp1Request(url, request.method as "GET" | "HEAD", request.headers),
    );
    writer.releaseLock();

    reader =
      socket.readable.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    let received = new Uint8Array();
    let parsed;
    while (true) {
      let headerEnd = findHttp1HeaderEnd(received);
      while (headerEnd < 0) {
        const chunk = await reader.read();
        if (chunk.done) {
          throw new Error("Upstream closed before sending response headers");
        }
        received = concatBytes(received, chunk.value);
        headerEnd = findHttp1HeaderEnd(received);
        if (headerEnd < 0 && received.length > MAX_RESPONSE_HEADER_BYTES) {
          throw new Error("Upstream response headers are too large");
        }
      }

      parsed = parseHttp1ResponseHead(received);
      if (parsed.status === 101) {
        throw new Error("Upstream protocol upgrades are not supported");
      }
      if (parsed.status >= 200) break;
      received = received.subarray(parsed.bodyOffset);
    }

    const contentEncoding = parsed.headers.get("content-encoding");
    if (contentEncoding && contentEncoding.toLowerCase() !== "identity") {
      throw new Error("Upstream ignored identity content encoding");
    }
    const bodyPrefix = received.subarray(parsed.bodyOffset);
    if (
      request.method === "HEAD" ||
      parsed.status === 204 ||
      parsed.status === 205 ||
      parsed.status === 304
    ) {
      await reader.cancel();
      cleanup();
      return new Response(null, {
        status: parsed.status,
        statusText: parsed.statusText,
        headers: parsed.headers,
      });
    }

    const bodyReader = reader;
    const bodyHeaders = new Headers(parsed.headers);
    const bodyIterator = decodeHttp1Body(bodyReader, bodyPrefix, bodyHeaders)[
      Symbol.asyncIterator
    ]();
    parsed.headers.delete("connection");
    parsed.headers.delete("keep-alive");
    parsed.headers.delete("proxy-authenticate");
    parsed.headers.delete("proxy-authorization");
    parsed.headers.delete("te");
    parsed.headers.delete("upgrade");
    if (bodyHeaders.has("transfer-encoding")) {
      parsed.headers.delete("content-length");
      parsed.headers.delete("trailer");
      parsed.headers.delete("transfer-encoding");
    }
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = await bodyIterator.next();
          if (chunk.done) {
            controller.close();
            cleanup();
            return;
          }
          controller.enqueue(chunk.value);
        } catch (error) {
          controller.error(error);
          cleanup();
        }
      },
      async cancel(reason) {
        try {
          await bodyIterator.return?.(undefined);
          await bodyReader.cancel(reason);
        } finally {
          cleanup();
        }
      },
    });

    return new Response(body, {
      status: parsed.status,
      statusText: parsed.statusText,
      headers: parsed.headers,
    });
  } catch (error) {
    if (reader) await reader.cancel().catch(() => {});
    cleanup();
    throw error;
  }
}
