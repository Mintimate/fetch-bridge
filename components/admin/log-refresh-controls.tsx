"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogRefreshControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      disabled={isPending}
      onClick={refresh}
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "刷新中…" : "刷新"}
    </Button>
  );
}
