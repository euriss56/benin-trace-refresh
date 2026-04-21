import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  MapPin,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsDashboard,
  head: () => ({ meta: [{ title: "Analytics — Admin TraceIMEI-BJ" }] }),
});

interface CheckRow {
  checked_at: string;
  result: string;
  risk_score: number;
  city: string | null;
  source: string | null;
  latency_ms: number | null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function AnalyticsDashboard() {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("imei_checks")
        .select("checked_at, result, risk_score, city, source, latency_ms")
        .gte("checked_at", since.toISOString())
        .order("checked_at", { ascending: false })
        .limit(5000);
      setRows((data ?? []) as CheckRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const today = startOfDay(new Date()).getTime();
    const todayCount = rows.filter(
      (r) => new Date(r.checked_at).getTime() >= today
    ).length;
    const stolen = rows.filter((r) => r.result === "stolen").length;
    const suspect = rows.filter((r) => r.result === "suspect").length;
    const safe = rows.filter((r) => r.result === "safe").length;
    return {
      total,
      todayCount,
      stolen,
      suspect,
      safe,
      pctStolen: total ? (stolen / total) * 100 : 0,
      pctSuspect: total ? (suspect / total) * 100 : 0,
    };
  }, [rows]);

  // 1. Évolution des vérifications (30 derniers jours)
  const dailySeries = useMemo(() => {
    const map = new Map<string, { day: string; total: number; suspects: number }>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = startOfDay(d).toISOString();
      map.set(key, { day: fmtDay(d), total: 0, suspects: 0 });
    }
    for (const r of rows) {
      const key = startOfDay(new Date(r.checked_at)).toISOString();
      const entry = map.get(key);
      if (entry) {
        entry.total++;
        if (r.result === "suspect" || r.result === "stolen") entry.suspects++;
      }
    }
    return Array.from(map.values());
  }, [rows]);

  // 2. Répartition statuts
  const statusPie = useMemo(
    () => [
      { name: "Légitime", value: stats.safe, color: "hsl(var(--success))" },
      { name: "Suspect", value: stats.suspect, color: "hsl(var(--warning))" },
      { name: "Volé", value: stats.stolen, color: "hsl(var(--destructive))" },
    ],
    [stats]
  );

  // 3. Distribution scores de risque (10 buckets de 10)
  const scoreHist = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      bucket: `${i * 10}-${i * 10 + 9}`,
      count: 0,
    }));
    for (const r of rows) {
      const idx = Math.min(9, Math.max(0, Math.floor((r.risk_score ?? 0) / 10)));
      buckets[idx].count++;
    }
    return buckets;
  }, [rows]);

  // 4. Top zones
  const topZones = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const c = (r.city ?? "").trim();
      if (!c) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  // 6. Performance latence (moyenne par jour, ML uniquement)
  const latencySeries = useMemo(() => {
    const map = new Map<string, { day: string; sum: number; n: number }>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = startOfDay(d).toISOString();
      map.set(key, { day: fmtDay(d), sum: 0, n: 0 });
    }
    for (const r of rows) {
      if (r.latency_ms == null) continue;
      const key = startOfDay(new Date(r.checked_at)).toISOString();
      const e = map.get(key);
      if (e) {
        e.sum += r.latency_ms;
        e.n++;
      }
    }
    return Array.from(map.values()).map((e) => ({
      day: e.day,
      avg_ms: e.n ? Math.round(e.sum / e.n) : 0,
    }));
  }, [rows]);

  // 5. Activité suspecte avec détection de pics (z-score >= 2)
  const suspectAnalysis = useMemo(() => {
    const values = dailySeries.map((d) => d.suspects);
    const n = values.length;
    const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
    const variance =
      n ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n : 0;
    const std = Math.sqrt(variance);
    const PEAK_Z = 2;
    const series = dailySeries.map((d) => {
      const z = std > 0 ? (d.suspects - mean) / std : 0;
      const isPeak = std > 0 && z >= PEAK_Z && d.suspects > 0;
      return { ...d, zScore: Number(z.toFixed(2)), isPeak };
    });
    const peakCount = series.filter((d) => d.isPeak).length;
    const threshold = std > 0 ? Math.ceil(mean + PEAK_Z * std) : 0;
    return { series, mean, std, peakCount, threshold };
  }, [dailySeries]);


  return (
    <DashboardLayout title="Analytics" requireRoles={["admin"]}>
      <div className="max-w-6xl space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Vérifications (30j)"
            value={stats.total.toLocaleString("fr-FR")}
            icon={Activity}
            tone="primary"
          />
          <Kpi
            label="Aujourd'hui"
            value={stats.todayCount.toLocaleString("fr-FR")}
            icon={TrendingUp}
            tone="primary"
          />
          <Kpi
            label="% Suspects"
            value={`${stats.pctSuspect.toFixed(1)}%`}
            icon={AlertTriangle}
            tone="warning"
          />
          <Kpi
            label="% Volés"
            value={`${stats.pctStolen.toFixed(1)}%`}
            icon={ShieldAlert}
            tone="destructive"
          />
        </div>

        {loading && (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Chargement des données…
            </CardContent>
          </Card>
        )}

        {!loading && rows.length === 0 && (
          <Card className="border-dashed border-border">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune vérification IMEI sur les 30 derniers jours. Les graphiques apparaîtront
                dès qu'un utilisateur effectuera une vérification.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Évolution + Répartition */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard
                title="Évolution des vérifications"
                subtitle="30 derniers jours"
                icon={TrendingUp}
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Répartition des statuts" icon={CheckCircle2}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPie.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Distribution scores + Top zones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title="Distribution des scores de risque"
                subtitle="Concentration 0-100"
                icon={Gauge}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={scoreHist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Vérifications" radius={[6, 6, 0, 0]}>
                      {scoreHist.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i < 3
                              ? "hsl(var(--success))"
                              : i < 7
                              ? "hsl(var(--warning))"
                              : "hsl(var(--destructive))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Zones les plus actives"
                subtitle="Top 8 villes"
                icon={MapPin}
              >
                {topZones.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    Aucune donnée géographique disponible.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={topZones}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <YAxis
                        dataKey="city"
                        type="category"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" name="Scans" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Activité suspecte + Latence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title="Activité suspecte"
                subtitle={
                  suspectAnalysis.peakCount > 0
                    ? `${suspectAnalysis.peakCount} pic${suspectAnalysis.peakCount > 1 ? "s" : ""} détecté${suspectAnalysis.peakCount > 1 ? "s" : ""} (z-score ≥ 2)`
                    : "IMEI suspects/volés par jour — aucun pic"
                }
                icon={AlertTriangle}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={suspectAnalysis.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number, _name, item) => {
                        const z = (item?.payload as { zScore?: number })?.zScore;
                        const peak = (item?.payload as { isPeak?: boolean })?.isPeak;
                        return [
                          `${value} ${peak ? "⚠️ pic" : ""} (z=${z ?? 0})`,
                          "Anomalies",
                        ];
                      }}
                    />
                    {suspectAnalysis.threshold > 0 && (
                      <ReferenceLine
                        y={suspectAnalysis.threshold}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="4 4"
                        label={{
                          value: `Seuil pic (${suspectAnalysis.threshold})`,
                          fill: "hsl(var(--destructive))",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                    )}
                    <Bar
                      dataKey="suspects"
                      name="Anomalies"
                      radius={[6, 6, 0, 0]}
                    >
                      {suspectAnalysis.series.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.isPeak ? "hsl(var(--destructive))" : "hsl(var(--warning))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {suspectAnalysis.peakCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} />
                    <span>
                      <strong>Pic détecté</strong> — jour(s) où l'activité suspecte dépasse 2 écarts-types
                      au-dessus de la moyenne ({suspectAnalysis.mean.toFixed(1)}).
                    </span>
                  </div>
                )}
              </ChartCard>

              <ChartCard
                title="Performance API (ML)"
                subtitle="Latence moyenne (ms) — 14j"
                icon={Cpu}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={latencySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      unit=" ms"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_ms"
                      name="Latence moyenne"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Données calculées sur les <Badge variant="outline" className="mx-1">{rows.length}</Badge>
              dernières vérifications (30 jours max).
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: "primary" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/15 text-warning"
      : tone === "destructive"
      ? "bg-destructive/15 text-destructive"
      : "gradient-primary text-primary-foreground";
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl ${toneClass} flex items-center justify-center mb-3`}>
          <Icon size={18} />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-border/50 ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Icon size={16} className="text-primary" />
              {title}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
