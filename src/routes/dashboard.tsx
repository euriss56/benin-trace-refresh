import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, FilePlus, History, AlertTriangle, ShieldCheck, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Tableau de bord — TraceIMEI-BJ" }] }),
});

function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({ checks: 0, declared: 0, suspect: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
        supabase.from("imei_checks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("imei_checks").select("*", { count: "exact", head: true }).eq("user_id", user.id).neq("result", "safe"),
      ]);
      setStats({ checks: c1 ?? 0, declared: c2 ?? 0, suspect: c3 ?? 0 });
    })();
  }, [user]);

  return (
    <DashboardLayout title={t("dash.title")}>
      <div className="space-y-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Search, label: t("dash.stat.checks"), value: stats.checks, color: "text-primary bg-primary/10" },
            { icon: FilePlus, label: t("dash.stat.declared"), value: stats.declared, color: "text-accent-foreground bg-accent/30" },
            { icon: AlertTriangle, label: t("dash.stat.suspect"), value: stats.suspect, color: "text-destructive bg-destructive/10" },
          ].map(({ icon: Icon, label, value, color }) => (
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
      </div>
    </DashboardLayout>
  );
}
