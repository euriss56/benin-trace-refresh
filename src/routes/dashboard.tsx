import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  FilePlus,
  History,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  BadgeCheck,
  Shield,
  Users,
  FileText,
  MapPin,
  Cpu,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Tableau de bord — TraceIMEI-BJ" }] }),
});

function DashboardPage() {
  const { user, role } = useAuth();
  const { t } = useI18n();

  return (
    <DashboardLayout title={t("dash.title")}>
      <div className="space-y-6 max-w-6xl">
        {role === "admin" ? (
          <AdminWidgets userId={user?.id ?? ""} />
        ) : role === "enqueteur" ? (
          <EnqueteurWidgets />
        ) : role === "technicien" || role === "dealer" ? (
          <DealerTechWidgets userId={user?.id ?? ""} role={role} />
        ) : (
          <UserWidgets userId={user?.id ?? ""} />
        )}
      </div>
    </DashboardLayout>
  );
}

// =============================================================================
// PARTICULIER (user)
// =============================================================================
function UserWidgets({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [stats, setStats] = useState({ checks: 0, declared: 0, suspect: 0 });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        supabase.from("imei_checks").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("imei_checks").select("*", { count: "exact", head: true }).eq("user_id", userId).neq("result", "safe"),
      ]);
      setStats({ checks: c1 ?? 0, declared: c2 ?? 0, suspect: c3 ?? 0 });
    })();
  }, [userId]);

  return (
    <>
      <StatGrid
        items={[
          { icon: Search, label: t("dash.stat.checks"), value: stats.checks, color: "text-primary bg-primary/10" },
          { icon: FilePlus, label: t("dash.stat.declared"), value: stats.declared, color: "text-accent-foreground bg-accent/30" },
          { icon: AlertTriangle, label: t("dash.stat.suspect"), value: stats.suspect, color: "text-destructive bg-destructive/10" },
        ]}
      />
      <QuickActions />
      <RecentHistoryCard />
    </>
  );
}

// =============================================================================
// DEALER / TECHNICIEN
// =============================================================================
function DealerTechWidgets({ userId, role }: { userId: string; role: "dealer" | "technicien" }) {
  const { t } = useI18n();
  const [monthlyChecks, setMonthlyChecks] = useState(0);
  const [recent, setRecent] = useState<{ imei: string; result: string; risk_score: number; checked_at: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; case_number: string; brand: string; model: string; status: string; created_at: string }[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const since = new Date();
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const [{ count: monthCount }, recentRes, reportsRes] = await Promise.all([
        supabase
          .from("imei_checks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("checked_at", since.toISOString()),
        supabase
          .from("imei_checks")
          .select("imei, result, risk_score, checked_at")
          .eq("user_id", userId)
          .order("checked_at", { ascending: false })
          .limit(20),
        supabase
          .from("stolen_phones")
          .select("id, case_number, brand, model, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setMonthlyChecks(monthCount ?? 0);
      setRecent(recentRes.data ?? []);
      setReports(reportsRes.data ?? []);
    })();
  }, [userId]);

  const certified = monthlyChecks >= 20;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Profil</p>
          <p className="text-lg font-bold capitalize">{role === "dealer" ? "Dealer / Revendeur" : "Technicien / Réparateur"}</p>
        </div>
        {certified && (
          <Badge className="gap-1.5 bg-success/15 text-success border-success/40 px-3 py-1.5 text-sm">
            <BadgeCheck size={16} />
            {role === "dealer" ? "Dealer Certifié" : "Technicien Certifié"} ({monthlyChecks}+ vérifs / mois)
          </Badge>
        )}
      </div>

      <StatGrid
        items={[
          { icon: Search, label: "Vérifications ce mois", value: monthlyChecks, color: "text-primary bg-primary/10" },
          { icon: FilePlus, label: "Mes signalements", value: reports.length, color: "text-accent-foreground bg-accent/30" },
          { icon: TrendingUp, label: "Total cumulé", value: recent.length, color: "text-success bg-success/10" },
        ]}
      />

      <QuickActions />

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <History size={20} className="text-primary" />
            Mes 20 dernières vérifications
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune vérification pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="text-left py-2">IMEI</th>
                    <th className="text-left py-2">Statut</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{r.imei}</td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={
                            r.result === "stolen"
                              ? "border-destructive/40 text-destructive"
                              : r.result === "suspect"
                                ? "border-warning/40 text-warning"
                                : "border-success/40 text-success"
                          }
                        >
                          {r.result}
                        </Badge>
                      </td>
                      <td className="py-2">{r.risk_score}/100</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(r.checked_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Mes signalements de vol
          </h2>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun signalement enregistré.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{r.case_number}</p>
                    <p className="font-semibold text-sm">{r.brand} {r.model}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// =============================================================================
// ENQUÊTEUR
// =============================================================================
function EnqueteurWidgets() {
  const [stats, setStats] = useState({ total: 0, active: 0, recent: 0 });
  const [reports, setReports] = useState<{ id: string; case_number: string; brand: string; model: string; status: string; city: string; created_at: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "stolen" | "recovered">("all");

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ count: total }, { count: active }, { count: recent }] = await Promise.all([
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }).eq("status", "stolen"),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);
      setStats({ total: total ?? 0, active: active ?? 0, recent: recent ?? 0 });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("stolen_phones")
        .select("id, case_number, brand, model, status, city, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setReports(data ?? []);
    })();
  }, [statusFilter]);

  const exportCsv = () => {
    const headers = ["case_number", "brand", "model", "status", "city", "created_at"];
    const csv = [headers, ...reports.map((r) => [r.case_number, r.brand, r.model, r.status, r.city, r.created_at])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <StatGrid
        items={[
          { icon: FileText, label: "Signalements totaux", value: stats.total, color: "text-primary bg-primary/10" },
          { icon: AlertTriangle, label: "Téléphones volés actifs", value: stats.active, color: "text-destructive bg-destructive/10" },
          { icon: Activity, label: "Nouveaux (7j)", value: stats.recent, color: "text-warning bg-warning/10" },
        ]}
      />

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              Tous les signalements
            </h2>
            <div className="flex items-center gap-2">
              {(["all", "stolen", "recovered"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Tous" : s === "stolen" ? "Volés" : "Récupérés"}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={exportCsv}>Exporter CSV</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Link to="/map">
              <Button variant="outline" className="w-full justify-start gap-2">
                <MapPin size={16} /> Voir la carte des incidents
              </Button>
            </Link>
            <Link to="/police-reports">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText size={16} /> Vue détaillée des signalements
              </Button>
            </Link>
          </div>

          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun signalement.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="text-left py-2">Référence</th>
                    <th className="text-left py-2">Téléphone</th>
                    <th className="text-left py-2">Ville</th>
                    <th className="text-left py-2">Statut</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{r.case_number}</td>
                      <td className="py-2">{r.brand} {r.model}</td>
                      <td className="py-2 text-xs">{r.city}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// =============================================================================
// ADMIN
// =============================================================================
function AdminWidgets({ userId }: { userId: string }) {
  const [stats, setStats] = useState({ users: 0, phones: 0, checks: 0, suspect: 0 });
  const [mlMeta, setMlMeta] = useState<{ accuracy: number; samples: number; trained_at: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ count: u }, { count: p }, { count: c }, { count: s }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }),
        supabase.from("imei_checks").select("*", { count: "exact", head: true }),
        supabase.from("imei_checks").select("*", { count: "exact", head: true }).neq("result", "safe"),
      ]);
      setStats({ users: u ?? 0, phones: p ?? 0, checks: c ?? 0, suspect: s ?? 0 });

      const { data: lastTrain } = await supabase
        .from("ml_training_logs")
        .select("accuracy, training_samples, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastTrain && lastTrain.accuracy !== null) {
        setMlMeta({
          accuracy: lastTrain.accuracy,
          samples: lastTrain.training_samples,
          trained_at: lastTrain.created_at,
        });
      }
    })();
  }, []);

  const cloningRate = useMemo(() => {
    if (stats.checks === 0) return 0;
    return ((stats.suspect / stats.checks) * 100).toFixed(1);
  }, [stats]);

  const accuracyAlert = mlMeta && mlMeta.accuracy < 0.85;

  return (
    <>
      <StatGrid
        items={[
          { icon: Users, label: "Utilisateurs", value: stats.users, color: "text-primary bg-primary/10" },
          { icon: Search, label: "Vérifications IMEI", value: stats.checks, color: "text-success bg-success/10" },
          { icon: FileText, label: "Téléphones déclarés", value: stats.phones, color: "text-warning bg-warning/10" },
          { icon: AlertTriangle, label: `Taux suspect : ${cloningRate}%`, value: stats.suspect, color: "text-destructive bg-destructive/10" },
        ]}
      />

      <Card className={`border ${accuracyAlert ? "border-destructive/50 bg-destructive/5" : "border-border/50"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Cpu size={20} className="text-primary" />
              Métriques ML
            </h2>
            {accuracyAlert && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle size={12} /> Précision sous 85%
              </Badge>
            )}
          </div>
          {mlMeta ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MlMetric
                label="Précision (accuracy)"
                value={`${(mlMeta.accuracy * 100).toFixed(1)}%`}
              alert={accuracyAlert ?? false}
              />
              <MlMetric label="Échantillons d'entraînement" value={mlMeta.samples.toLocaleString("fr-FR")} />
              <MlMetric
                label="Dernier réentraînement"
                value={new Date(mlMeta.trained_at).toLocaleDateString("fr-FR")}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun modèle entraîné. <Link to="/admin/ml" className="text-primary underline">Entraîner maintenant</Link>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { to: "/admin/users", icon: Users, label: "Utilisateurs", desc: "Gérer comptes et rôles" },
          { to: "/admin/analytics", icon: Activity, label: "Analytics", desc: "Graphiques et tendances" },
          { to: "/admin/ml", icon: Cpu, label: "ML Training", desc: "Réentraîner le modèle" },
          { to: "/map", icon: MapPin, label: "Carte des incidents", desc: "Vue géographique" },
          { to: "/police-reports", icon: FileText, label: "Tous les signalements", desc: "Vue d'ensemble" },
          { to: "/admin/contacts", icon: Shield, label: "Contacts police", desc: "Commissariats" },
        ].map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to}>
            <Card className="border-border/50 hover:shadow-elegant transition-all hover:-translate-y-0.5 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

// =============================================================================
// Composants partagés
// =============================================================================
function StatGrid({
  items,
}: {
  items: { icon: typeof Search; label: string; value: number; color: string }[];
}) {
  return (
    <div className={`grid grid-cols-1 ${items.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4`}>
      {items.map(({ icon: Icon, label, value, color }) => (
        <Card key={label} className="border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuickActions() {
  const { t } = useI18n();
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" />
          {t("dash.quick.title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/verify">
            <Button className="w-full justify-start h-auto py-4 gradient-primary text-primary-foreground">
              <Search className="mr-3" size={18} />
              <div className="text-left">
                <div className="font-semibold">{t("dash.quick.verify.title")}</div>
                <div className="text-xs opacity-90">{t("dash.quick.verify.desc")}</div>
              </div>
            </Button>
          </Link>
          <Link to="/declare">
            <Button variant="outline" className="w-full justify-start h-auto py-4 border-destructive/40 text-destructive hover:bg-destructive/5">
              <Smartphone className="mr-3" size={18} />
              <div className="text-left">
                <div className="font-semibold">{t("dash.quick.declare.title")}</div>
                <div className="text-xs opacity-80">{t("dash.quick.declare.desc")}</div>
              </div>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentHistoryCard() {
  const { t } = useI18n();
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <History size={20} className="text-primary" />
          {t("dash.recent.title")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{t("dash.recent.desc")}</p>
        <Link to="/history">
          <Button variant="outline">{t("dash.recent.cta")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function MlMetric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
