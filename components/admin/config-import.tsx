"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfigImport() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setMessage("");
    setBusy(true);
    try {
      const text = await file.text();
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const err =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "导入失败。";
        throw new Error(err);
      }
      const imported = (data as { imported?: Record<string, number> }).imported;
      setMessage(
        `已导入：${imported?.sources ?? 0} 个源站、${imported?.routes ?? 0} 条路由（跳过 ${imported?.routesSkipped ?? 0} 条）。`,
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "正在导入…" : "导入配置"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {message && <p className="w-full text-sm text-red-600">{message}</p>}
    </div>
  );
}
