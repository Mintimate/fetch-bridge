"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";

import { Button } from "@/components/ui/button";

const refreshIntervalMs = 15_000;

export function LogRefreshControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">每 15 秒自动刷新</span>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={isPending}
        onClick={refresh}
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "刷新中…" : "立即刷新"}
      </Button>
    </div>
  );
}
