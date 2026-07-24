const HEADER_TERMINATOR = new Uint8Array([13, 10, 13, 10]);
const LINE_TERMINATOR = new Uint8Array([13, 10]);
const MAX_CHUNK_LINE_BYTES = 8 * 1024;
const MAX_TRAILER_BYTES = 64 * 1024;

export type ParsedHttp1ResponseHead = {
  status: number;
  statusText: string;
  headers: Headers;
  bodyOffset: number;
};

export function findHttp1HeaderEnd(bytes: Uint8Array) {
  outer: for (
    let index = 0;
    index <= bytes.length - HEADER_TERMINATOR.length;
    index += 1
  ) {
    for (let offset = 0; offset < HEADER_TERMINATOR.length; offset += 1) {
      if (bytes[index + offset] !== HEADER_TERMINATOR[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

export function isIdentitySocketCandidate(url: URL, headers: Headers) {
  return url.protocol === "https:" && headers.has("range");
}

export function isByteRangeResponseCoherent(
  requestedRange: string | null,
  status: number,
  headers: Headers,
) {
  if (!requestedRange || status !== 206) return true;
  const encoding = headers.get("content-encoding")?.toLowerCase();
  if (encoding && encoding !== "identity") return false;

  const contentRange = headers
    .get("content-range")
    ?.match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i);
  if (!contentRange) return false;

  const start = Number(contentRange[1]);
  const end = Number(contentRange[2]);
  const contentLength = Number(headers.get("content-length"));
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    end < start ||
    !Number.isSafeInteger(contentLength) ||
    contentLength !== end - start + 1
  ) {
    return false;
  }
  if (
    !responseMatchesRequestedRange(
      requestedRange,
      start,
      end,
      contentRange[3] ?? "*",
    )
  ) {
    return false;
  }

  const identityLengthHeader = headers.get("x-identity-content-length");
  if (identityLengthHeader !== null && contentRange[3] !== "*") {
    const identityLength = Number(identityLengthHeader);
    const total = Number(contentRange[3]);
    if (
      Number.isSafeInteger(identityLength) &&
      Number.isSafeInteger(total) &&
      identityLength >= 0 &&
      total >= 0 &&
      identityLength !== total
    ) {
      return false;
    }
  }

  return true;
}

function responseMatchesRequestedRange(
  requestedRange: string,
  start: number,
  end: number,
  totalToken: string,
) {
  const requested = requestedRange.match(/^bytes=(\d*)-(\d*)$/i);
  if (!requested || (!requested[1] && !requested[2])) return false;
  const total = totalToken === "*" ? null : Number(totalToken);
  if (
    total !== null &&
    (!Number.isSafeInteger(total) || total <= 0 || end >= total)
  ) {
    return false;
  }

  if (requested[1]) {
    const requestedStart = Number(requested[1]);
    if (!Number.isSafeInteger(requestedStart) || start !== requestedStart) {
      return false;
    }
    if (requested[2]) {
      const requestedEnd = Number(requested[2]);
      if (!Number.isSafeInteger(requestedEnd)) return false;
      const expectedEnd =
        total === null ? requestedEnd : Math.min(requestedEnd, total - 1);
      return end === expectedEnd;
    }
    return total === null || end === total - 1;
  }

  const suffixLength = Number(requested[2]);
  if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
  if (total === null) return end - start + 1 <= suffixLength;
  return end === total - 1 && start === Math.max(total - suffixLength, 0);
}

export function parseHttp1ResponseHead(
  bytes: Uint8Array,
): ParsedHttp1ResponseHead {
  const headerEnd = findHttp1HeaderEnd(bytes);
  if (headerEnd < 0)
    throw new Error("Upstream response headers are incomplete");

  const text = new TextDecoder("latin1").decode(bytes.subarray(0, headerEnd));
  const [statusLine, ...headerLines] = text.split("\r\n");
  const statusMatch = statusLine?.match(
    /^HTTP\/1\.[01] ([1-5]\d{2})(?: (.*))?$/,
  );
  if (!statusMatch) throw new Error("Upstream returned an invalid status line");

  const status = Number(statusMatch[1]);
  const headers = new Headers();
  for (const line of headerLines) {
    if (!line || /^[ \t]/.test(line)) {
      throw new Error("Upstream returned invalid folded headers");
    }
    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error("Upstream returned an invalid header");
    headers.append(
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    );
  }

  return {
    status,
    statusText: statusMatch[2] ?? "",
    headers,
    bodyOffset: headerEnd + HEADER_TERMINATOR.length,
  };
}

export function buildHttp1Request(
  url: URL,
  method: "GET" | "HEAD",
  sourceHeaders: Headers,
) {
  const headers = new Headers(sourceHeaders);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  headers.delete("transfer-encoding");
  headers.set("accept-encoding", "identity");
  headers.set("connection", "close");
  headers.set("host", url.host);

  const lines = [`${method} ${url.pathname}${url.search} HTTP/1.1`];
  headers.forEach((value, name) => lines.push(`${name}: ${value}`));
  lines.push("", "");
  return new TextEncoder().encode(lines.join("\r\n"));
}

function concatBytes(left: Uint8Array, right: Uint8Array) {
  const combined = new Uint8Array(left.length + right.length);
  combined.set(left);
  combined.set(right, left.length);
  return combined;
}

class BufferedHttp1Reader {
  private buffered: Uint8Array;

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
    initialBytes: Uint8Array,
  ) {
    this.buffered = initialBytes;
  }

  private async fill() {
    const chunk = await this.reader.read();
    if (chunk.done) return false;
    this.buffered = concatBytes(this.buffered, chunk.value);
    return true;
  }

  async readLine(maxBytes = MAX_CHUNK_LINE_BYTES) {
    while (true) {
      const end = findSequence(this.buffered, LINE_TERMINATOR);
      if (end >= 0) {
        if (end > maxBytes) {
          throw new Error("Upstream chunk metadata is too large");
        }
        const line = this.buffered.subarray(0, end);
        this.buffered = this.buffered.subarray(end + LINE_TERMINATOR.length);
        return new TextDecoder("latin1").decode(line);
      }
      if (this.buffered.length > maxBytes) {
        throw new Error("Upstream chunk metadata is too large");
      }
      if (!(await this.fill())) {
        throw new Error("Upstream body ended before a complete line");
      }
    }
  }

  async *readExactly(length: number): AsyncGenerator<Uint8Array> {
    let remaining = length;
    while (remaining > 0) {
      if (this.buffered.length === 0 && !(await this.fill())) {
        throw new Error("Upstream body ended before Content-Length");
      }
      const size = Math.min(remaining, this.buffered.length);
      const chunk = this.buffered.subarray(0, size);
      this.buffered = this.buffered.subarray(size);
      remaining -= size;
      if (chunk.length > 0) yield chunk;
    }
  }

  async consumeCrlf() {
    const bytes: number[] = [];
    for await (const chunk of this.readExactly(LINE_TERMINATOR.length)) {
      bytes.push(...chunk);
    }
    if (bytes[0] !== LINE_TERMINATOR[0] || bytes[1] !== LINE_TERMINATOR[1]) {
      throw new Error("Upstream returned invalid chunk framing");
    }
  }

  async *readToEnd(): AsyncGenerator<Uint8Array> {
    if (this.buffered.length > 0) {
      yield this.buffered;
      this.buffered = new Uint8Array();
    }
    while (true) {
      const chunk = await this.reader.read();
      if (chunk.done) return;
      yield chunk.value;
    }
  }
}

function findSequence(bytes: Uint8Array, sequence: Uint8Array) {
  outer: for (
    let index = 0;
    index <= bytes.length - sequence.length;
    index += 1
  ) {
    for (let offset = 0; offset < sequence.length; offset += 1) {
      if (bytes[index + offset] !== sequence[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function parseContentLength(headers: Headers) {
  const raw = headers.get("content-length");
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) throw new Error("Invalid upstream Content-Length");
  const length = Number(raw);
  if (!Number.isSafeInteger(length)) {
    throw new Error("Upstream Content-Length is too large");
  }
  return length;
}

export async function* decodeHttp1Body(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  initialBytes: Uint8Array,
  headers: Headers,
): AsyncGenerator<Uint8Array> {
  const buffered = new BufferedHttp1Reader(reader, initialBytes);
  const transferEncoding = headers.get("transfer-encoding");

  if (transferEncoding) {
    const codings = transferEncoding
      .split(",")
      .map((coding) => coding.trim().toLowerCase())
      .filter(Boolean);
    if (codings.length !== 1 || codings[0] !== "chunked") {
      throw new Error("Unsupported upstream Transfer-Encoding");
    }

    while (true) {
      const sizeLine = await buffered.readLine();
      const sizeToken = sizeLine.split(";", 1)[0]?.trim() ?? "";
      if (!/^[0-9a-f]+$/i.test(sizeToken)) {
        throw new Error("Upstream returned an invalid chunk size");
      }
      const size = Number.parseInt(sizeToken, 16);
      if (!Number.isSafeInteger(size)) {
        throw new Error("Upstream chunk is too large");
      }
      if (size === 0) {
        let trailerBytes = 0;
        while (true) {
          const trailer = await buffered.readLine();
          trailerBytes += trailer.length + LINE_TERMINATOR.length;
          if (trailerBytes > MAX_TRAILER_BYTES) {
            throw new Error("Upstream trailers are too large");
          }
          if (trailer === "") return;
          if (trailer.startsWith(" ") || trailer.startsWith("\t")) {
            throw new Error("Upstream returned invalid folded trailers");
          }
          if (trailer.indexOf(":") <= 0) {
            throw new Error("Upstream returned an invalid trailer");
          }
        }
      }
      yield* buffered.readExactly(size);
      await buffered.consumeCrlf();
    }
  }

  const contentLength = parseContentLength(headers);
  if (contentLength !== null) {
    yield* buffered.readExactly(contentLength);
    return;
  }
  yield* buffered.readToEnd();
}
