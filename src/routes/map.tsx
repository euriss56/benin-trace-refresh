import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { MapPin, Filter, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import type { IncidentPoint } from "@/components/MapView";

const MapView = lazy(() => import("@/components/MapView"));

export const Route = createFileRoute("/map")({
  component: MapPage,
  head: () => ({
    meta: [{ title: "Carte des incidents — TraceIMEI-BJ" }],
  }),
});

type Period = "7" | "30" | "90" | "all";
type StatusFilter = "all" | "stolen" | "recovered" | "pending";

function MapPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentPoint[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // JOIN via foreign key neighborhood_id -> neighborhoods
      const sinceIso =
        period === "all"
          ? null
          : new Date(Date.now() - parseInt(period, 10) * 86400000).toISOString();

      let query = supabase
        .from("stolen_phones")
        .select(
          "id, case_number, brand, model, status, created_at, neighborhood_id, neighborhoods(name, centroid_lat, centroid_lng)"
        )
        .not("neighborhood_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (sinceIso) query = query.gte("created_at", sinceIso);
      if (status !== "all") query = query.eq("status", status);

      const { data, error } = await query;
      if (cancelled) return;

      if (error) {
        console.error(error);
        setIncidents([]);
      } else {
        const points: IncidentPoint[] = (data ?? [])
          .map((row) => {
            const n = row.neighborhoods as
              | { name: string; centroid_lat: number; centroid_lng: number }
              | null;
            if (!n) return null;
            return {
              id: row.id,
              case_number: row.case_number,
              brand: row.brand,
              model: row.model,
              status: row.status,
              created_at: row.created_at,
              neighborhood_name: n.name,
              lat: n.centroid_lat,
              lng: n.centroid_lng,
            } satisfies IncidentPoint;
          })
          .filter((p): p is IncidentPoint => p !== null);
        setIncidents(points);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [period, status]);

  // Charger la liste des quartiers une fois
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("neighborhoods")
        .select("name")
        .order("name");
      setNeighborhoods((data ?? []).map((n) => n.name));
    })();
  }, []);

  const filtered = useMemo(() => {
    if (neighborhood === "all") return incidents;
    return incidents.filter((i) => i.neighborhood_name === neighborhood);
  }, [incidents, neighborhood]);

  const exportCsv = () => {
    const headers = ["case_number", "brand", "model", "status", "neighborhood", "created_at"];
    const rows = filtered.map((i) => [
      i.case_number,
      i.brand,
      i.model,
      i.status,
      i.neighborhood_name,
      i.created_at,
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Carte des incidents" requireRoles={["enqueteur", "admin"]}>
      <div className="space-y-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter size={16} className="text-primary" />
              Filtres
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Période</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="stolen">Volé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="recovered">Récupéré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Quartier</Label>
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les quartiers</SelectItem>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <MapPin size={12} />
                {filtered.length} incident{filtered.length > 1 ? "s" : ""}
              </Badge>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download size={14} className="mr-1.5" />
                Exporter CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            {loading ? (
              <div className="h-[500px] rounded-lg bg-muted/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="h-[500px] rounded-lg bg-muted/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-muted-foreground" size={32} />
                  </div>
                }
              >
                <MapView incidents={filtered} />
              </Suspense>
            )}
            <p className="text-xs text-muted-foreground mt-3 italic">
              Conformité loi béninoise n° 2017-20 : seuls les centroïdes des quartiers sont affichés —
              aucune coordonnée GPS exacte n'est collectée ni stockée.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
