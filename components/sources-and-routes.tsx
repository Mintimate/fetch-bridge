"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SourceForm } from "@/components/admin/forms";
import { SourceManagement } from "@/components/admin/source-management";
import { SourceRoutesPanel } from "@/components/source-routes-panel";

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

type SourcesAndRoutesProps = {
  sources: Source[];
  routes: Route[];
};

export function SourcesAndRoutes({
  sources,
  routes,
}: SourcesAndRoutesProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    sources[0]?.id ?? null,
  );
  const selected = sources.find((source) => source.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <SourceManagement
          sources={sources}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <SourceForm />
      </div>

      <div>
        {selected ? (
          <SourceRoutesPanel
            sourceId={selected.id}
            sourceName={selected.name}
            routes={routes}
            onAdded={() => router.refresh()}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            选择左侧源站以查看并管理其下载路由。
          </p>
        )}
      </div>
    </div>
  );
}
