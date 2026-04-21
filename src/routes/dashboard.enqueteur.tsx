import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, FileText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/enqueteur")({
  component: EnqueteurPage,
  head: () => ({ meta: [{ title: "Espace enquêteur — TraceIMEI-BJ" }] }),
});

function EnqueteurPage() {
  const [stats, setStats] = useState({ total: 0, stolen: 0, byCity: [] as { city: string; n: number }[] });

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("stolen_phones")
        .select("city, status", { count: "exact" })
        .limit(500);
      const stolen = data?.filter((d) => d.status === "stolen").length ?? 0;
      const cities: Record<string, number> = {};
      data?.forEach((d) => { cities[d.city] = (cities[d.city] ?? 0) + 1; });
      const byCity = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, n]) => ({ city, n }));
      setStats({ total: count ?? 0, stolen, byCity });
    })();
  }, []);

  return (
    <DashboardLayout title="Espace enquêteur" requireRoles={["enqueteur", "admin"]}>
      <div className="max-w-5xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Déclarations totales", value: stats.total, icon: FileText },
            { label: "Téléphones volés actifs", value: stats.stolen, icon: BadgeCheck },
            { label: "Vérifications quotidiennes", value: "—", icon: Search },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4">Top 5 villes</h3>
            <div className="space-y-2">
              {stats.byCity.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée pour le moment.</p>}
              {stats.byCity.map((c) => (
                <div key={c.city} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium text-foreground">{c.city}</span>
                  <span className="text-sm text-muted-foreground">{c.n} signalements</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/police-reports">
                <Button className="gradient-primary text-primary-foreground">
                  <FileText size={16} className="mr-2" /> Consulter toutes les déclarations
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
