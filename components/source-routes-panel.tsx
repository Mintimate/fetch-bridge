"use client";

import { UrlRouteQuickAdd } from "@/components/url-route-quick-add";
import { RouteManagement } from "@/components/admin/route-management";

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

type SourceRoutesPanelProps = {
  sourceId: string;
  sourceName: string;
  routes: Route[];
  onAdded?: () => void;
};

export function SourceRoutesPanel({
  sourceId,
  sourceName,
  routes,
  onAdded,
}: SourceRoutesPanelProps) {
  const sourceRoutes = routes.filter((route) => route.sourceId === sourceId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">源站</p>
        <h2 className="mt-1 text-xl font-semibold">{sourceName}</h2>
      </div>

      <UrlRouteQuickAdd
        sourceId={sourceId}
        sourceName={sourceName}
        onAdded={onAdded}
      />

      <RouteManagement
        routes={sourceRoutes}
        sources={[{ id: sourceId, name: sourceName, enabled: true }]}
      />
    </div>
  );
}
