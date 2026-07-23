"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

async function post(path: string, payload: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string"
        ? data.error
        : "保存失败，请检查字段或重复的路径。",
    );
}
export function SourceForm() {
  const [message, setMessage] = useState("");
  async function submit(data: FormData) {
    try {
      const headers = JSON.parse(String(data.get("headers") || "{}"));
      await post("/api/admin/sources", {
        name: data.get("name"),
        baseUrl: data.get("baseUrl"),
        timeoutMs: Number(data.get("timeoutMs") || 30000),
        userAgent: data.get("userAgent"),
        headers,
      });
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Header 必须是有效 JSON 对象",
      );
    }
  }
  return (
    <form action={submit} className="grid gap-3 rounded-lg border p-5">
      <h2 className="font-medium">新建 Source</h2>
      <input
        name="name"
        required
        placeholder="名称，例如 Mozilla FTP"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <input
        name="baseUrl"
        required
        type="url"
        placeholder="https://ftp.mozilla.org"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="timeoutMs"
          type="number"
          defaultValue="30000"
          min="1000"
          max="120000"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="userAgent"
          placeholder="可选 User-Agent"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <textarea
        name="headers"
        defaultValue="{}"
        rows={3}
        placeholder={'{"Accept":"application/octet-stream"}'}
        className="rounded-md border bg-background p-3 font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        请求 Header JSON。Cookie、Authorization 和 X-Forwarded-* 会被拒绝。
      </p>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <Button className="w-fit">保存 Source</Button>
    </form>
  );
}
export function RouteForm({
  sources,
  defaultSourceId,
}: {
  sources: { id: string; name: string }[];
  defaultSourceId?: string;
}) {
  const [message, setMessage] = useState("");
  async function submit(data: FormData) {
    try {
      await post("/api/admin/routes", {
        name: data.get("name"),
        description: data.get("description"),
        pathPrefix: data.get("pathPrefix"),
        targetPath: data.get("targetPath"),
        sourceId: data.get("sourceId"),
        enabled: true,
        isPublic: true,
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    }
  }
  return (
    <form action={submit} className="grid gap-3 rounded-lg border p-5">
      <h2 className="font-medium">新建 Route</h2>
      <input
        name="name"
        required
        placeholder="显示名称，例如 Firefox Android"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <input
        name="description"
        placeholder="可选描述"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="pathPrefix"
          required
          placeholder="/firefox"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="targetPath"
          required
          placeholder="/pub/fenix"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <select
        name="sourceId"
        required
        defaultValue={defaultSourceId}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">选择 Source</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <Button className="w-fit" disabled={!sources.length}>
        保存 Route
      </Button>
    </form>
  );
}
