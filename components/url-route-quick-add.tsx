"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { suggestRouteFromUrl } from "@/lib/route-suggestion";

type Suggestion = {
  sourceName: string;
  baseUrl: string;
  pathPrefix: string;
  targetPath: string;
  description: string;
};

type Props = {
  onAdded?: () => void;
  sourceId?: string;
  sourceName?: string;
};

export function UrlRouteQuickAdd({ onAdded, sourceId, sourceName }: Props) {
  const routeOnly = Boolean(sourceId);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [url, setUrl] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function derive() {
    setMessage("");
    try {
      setSuggestion(suggestRouteFromUrl(url));
    } catch (error) {
      setSuggestion(null);
      setMessage(
        error instanceof Error
          ? "请输入有效的 HTTPS 公网下载地址。"
          : "无法解析该地址。",
      );
    }
  }

  function startManual() {
    setMode("manual");
    setSuggestion({
      sourceName: "",
      baseUrl: "",
      pathPrefix: "",
      targetPath: "",
      description: "",
    });
    setMessage("");
  }

  function update(field: keyof Suggestion, value: string) {
    setSuggestion((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function confirm() {
    if (!suggestion) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/routes/from-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceName: sourceName || suggestion.sourceName,
          baseUrl: sourceName ? "" : suggestion.baseUrl,
          pathPrefix: suggestion.pathPrefix,
          targetPath: suggestion.targetPath,
          description: suggestion.description,
          ...(sourceId ? { attachedSourceId: sourceId } : {}),
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "创建失败。",
        );
      setUrl("");
      setSuggestion(null);
      setMode("auto");
      onAdded?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败。");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof Suggestion, label: string, mono = false) => (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={suggestion?.[key] ?? ""}
        onChange={(event) => update(key, event.target.value)}
        className={`mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">
          {routeOnly ? `为「${sourceName}」添加路由` : "添加下载路由"}
        </h2>
        {mode === "auto" ? (
          <Button type="button" variant="ghost" onClick={startManual}>
            手动添加
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMode("auto");
              setSuggestion(null);
              setMessage("");
            }}
          >
            改用地址解析
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {routeOnly
          ? "粘贴源站文件地址自动建议路径，或手动填写。"
          : "粘贴源站文件地址自动建议源站与路径，或手动填写。"}
      </p>

      {mode === "auto" && !suggestion && (
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") derive();
            }}
            placeholder="https://ftp.mozilla.org/pub/fenix/"
            className="h-9 min-w-64 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="button" variant="outline" onClick={derive}>
            解析
          </Button>
        </div>
      )}

      {suggestion && (
        <div className="mt-4 grid gap-3 rounded-md border bg-muted/30 p-4">
          {!routeOnly && (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("sourceName", "源站名称")}
              {field("baseUrl", "源站地址", true)}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("pathPrefix", "公开前缀", true)}
            {field("targetPath", "目标路径", true)}
          </div>
          {field("description", "备注")}
          {routeOnly && (
            <p className="text-xs text-muted-foreground">
              将添加到已选源站「{sourceName}」。
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={confirm} disabled={busy}>
              {busy ? "正在创建…" : "确认创建"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSuggestion(null);
                setMode("auto");
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
    </div>
  );
}
