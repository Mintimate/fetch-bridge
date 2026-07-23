"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Source = {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  timeoutMs: number;
  userAgent: string | null;
  headersJson: string;
  routeCount: number;
};

type SourceManagementProps = {
  sources: Source[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function errorMessage(data: unknown, fallback: string) {
  return data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
    ? data.error
    : fallback;
}

async function request(
  path: string,
  method: "PATCH" | "DELETE",
  payload?: unknown,
) {
  const response = await fetch(path, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(errorMessage(data, "操作失败，请稍后重试。"));
}

function parsedHeaders(headersJson: string) {
  try {
    const headers: unknown = JSON.parse(headersJson);
    return headers && typeof headers === "object" && !Array.isArray(headers)
      ? JSON.stringify(headers, null, 2)
      : "{}";
  } catch {
    return "{}";
  }
}

function SourceEditor({
  source,
  onCancel,
}: {
  source: Source;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save(formData: FormData) {
    setMessage("");
    setIsSaving(true);
    try {
      const headers = JSON.parse(String(formData.get("headers") || "{}"));
      await request(`/api/admin/sources/${source.id}`, "PATCH", {
        name: formData.get("name"),
        baseUrl: formData.get("baseUrl"),
        enabled: formData.get("enabled") === "on",
        timeoutMs: Number(formData.get("timeoutMs") || 30000),
        userAgent: formData.get("userAgent"),
        headers,
      });
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Header 必须是有效 JSON 对象。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      action={save}
      className="mt-4 grid gap-3 rounded-md border bg-muted/30 p-4"
    >
      <h3 className="font-medium">编辑 {source.name}</h3>
      <input
        name="name"
        required
        defaultValue={source.name}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <input
        name="baseUrl"
        type="url"
        required
        defaultValue={source.baseUrl}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="timeoutMs"
          type="number"
          min="1000"
          max="120000"
          defaultValue={source.timeoutMs}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="userAgent"
          defaultValue={source.userAgent ?? ""}
          placeholder="可选 User-Agent"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <textarea
        name="headers"
        rows={3}
        defaultValue={parsedHeaders(source.headersJson)}
        className="rounded-md border bg-background p-3 font-mono text-xs"
      />
      <label className="flex items-center gap-2 text-sm">
        <input name="enabled" type="checkbox" defaultChecked={source.enabled} />
        启用此 Source
      </label>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "正在保存…" : "保存修改"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}

export function SourceManagement({
  sources,
  selectedId,
  onSelect,
}: SourceManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(source: Source) {
    const routeWarning = source.routeCount
      ? `\n\n它关联的 ${source.routeCount} 条 Route 也会被删除。`
      : "";
    if (!window.confirm(`确定删除源站“${source.name}”吗？${routeWarning}`))
      return;

    setMessage("");
    setDeletingId(source.id);
    try {
      await request(`/api/admin/sources/${source.id}`, "DELETE");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "删除失败，请稍后重试。",
      );
      setDeletingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b px-5 py-3 text-xs text-muted-foreground">
        <span>源站</span>
        <span>路由 / 状态</span>
      </div>
      {sources.map((source) => (
        <div
          key={source.id}
          className={`border-b px-5 py-4 last:border-0 ${
            selectedId === source.id ? "bg-muted" : ""
          }`}
        >
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onSelect?.(source.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-medium">{source.name}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {source.baseUrl}
              </p>
            </button>
            <div className="shrink-0 text-right text-sm">
              <p>{source.routeCount} routes</p>
              <p
                className={
                  source.enabled
                    ? "mt-1 text-emerald-600"
                    : "mt-1 text-muted-foreground"
                }
              >
                {source.enabled ? "Enabled" : "Disabled"}
              </p>
              <div className="mt-2 flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setEditingId(source.id)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">编辑 {source.name}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  disabled={deletingId === source.id}
                  onClick={() => remove(source)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">删除 {source.name}</span>
                </Button>
              </div>
            </div>
          </div>
          {editingId === source.id && (
            <SourceEditor source={source} onCancel={() => setEditingId(null)} />
          )}
        </div>
      ))}
      {!sources.length && (
        <p className="p-6 text-sm text-muted-foreground">还没有源站。</p>
      )}
      {message && (
        <p className="border-t px-5 py-3 text-sm text-red-600">{message}</p>
      )}
    </section>
  );
}
