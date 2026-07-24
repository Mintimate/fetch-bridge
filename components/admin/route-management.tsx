"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/components/admin/fetch";

type SourceOption = { id: string; name: string; enabled: boolean };

type Route = {
  id: string;
  name: string;
  description: string | null;
  pathPrefix: string;
  targetPath: string;
  sourceId: string;
  sourceName: string;
  enabled: boolean;
  isPublic: boolean;
};

type RouteManagementProps = { routes: Route[]; sources: SourceOption[] };

function RouteEditor({
  route,
  sources,
  onCancel,
}: {
  route: Route;
  sources: SourceOption[];
  onCancel: () => void;
}) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save(formData: FormData) {
    setMessage("");
    setIsSaving(true);
    try {
      await adminFetch(`/api/admin/routes/${route.id}`, "PATCH", {
        name: formData.get("name"),
        description: formData.get("description"),
        pathPrefix: formData.get("pathPrefix"),
        targetPath: formData.get("targetPath"),
        sourceId: formData.get("sourceId"),
        enabled: formData.get("enabled") === "on",
        isPublic: formData.get("isPublic") === "on",
      });
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "保存失败，请稍后重试。",
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
      <h3 className="font-medium">编辑 {route.name}</h3>
      <input
        name="name"
        required
        defaultValue={route.name}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <input
        name="description"
        defaultValue={route.description ?? ""}
        placeholder="可选描述"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="pathPrefix"
          required
          defaultValue={route.pathPrefix}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="targetPath"
          required
          defaultValue={route.targetPath}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <select
        name="sourceId"
        required
        defaultValue={route.sourceId}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
            {source.enabled ? "" : "（已禁用）"}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={route.enabled}
          />
          启用此 Route
        </label>
        <label className="flex items-center gap-2">
          <input
            name="isPublic"
            type="checkbox"
            defaultChecked={route.isPublic}
          />
          公开下载
        </label>
      </div>
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

export function RouteManagement({ routes, sources }: RouteManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(route: Route) {
    if (!window.confirm(`确定删除 Route“${route.name}”吗？下载日志会保留。`))
      return;

    setMessage("");
    setDeletingId(route.id);
    try {
      await adminFetch(`/api/admin/routes/${route.id}`, "DELETE");
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
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b px-5 py-3 text-xs text-muted-foreground">
        <span>公开路径</span>
        <span>目标</span>
        <span>状态</span>
      </div>
      {routes.map((route) => (
        <div key={route.id} className="border-b px-5 py-4 last:border-0">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{route.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                /download{route.pathPrefix}/…
              </p>
            </div>
            <div className="min-w-0">
              <p className="truncate">{route.sourceName}</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {route.targetPath}
              </p>
            </div>
            <div className="text-right">
              <p
                className={
                  route.enabled ? "text-emerald-600" : "text-muted-foreground"
                }
              >
                {route.enabled ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {route.isPublic ? "公开" : "私有"}
              </p>
              <div className="mt-2 flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setEditingId(route.id)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">编辑 {route.name}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  disabled={deletingId === route.id}
                  onClick={() => remove(route)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">删除 {route.name}</span>
                </Button>
              </div>
            </div>
          </div>
          {editingId === route.id && (
            <RouteEditor
              route={route}
              sources={sources}
              onCancel={() => setEditingId(null)}
            />
          )}
        </div>
      ))}
      {!routes.length && (
        <p className="p-6 text-sm text-muted-foreground">还没有路由。</p>
      )}
      {message && (
        <p className="border-t px-5 py-3 text-sm text-red-600">{message}</p>
      )}
    </section>
  );
}
