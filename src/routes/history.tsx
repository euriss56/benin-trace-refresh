import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Historique — TraceIMEI-BJ" }] }),
});

interface Check { id: string; imei: string; result: string; risk_score: number; checked_at: string }

function HistoryPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", pt: "pt-PT", es: "es-ES" };
  const locale = localeMap[lang] ?? "fr-FR";
  const [items, setItems] = useState<Check[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("imei_checks").select("*").eq("user_id", user.id)
      .order("checked_at", { ascending: false }).limit(50)
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  const icon = (r: string) =>
    r === "safe" ? <CheckCircle2 className="text-success" size={18} /> :
    r === "stolen" ? <ShieldAlert className="text-destructive" size={18} /> :
    <AlertTriangle className="text-warning" size={18} />;

  const variant = (r: string): "default" | "destructive" | "secondary" =>
    r === "safe" ? "default" : r === "stolen" ? "destructive" : "secondary";

  const labelFor = (r: string) =>
    r === "safe" ? t("verify.status.safe") : r === "stolen" ? t("verify.status.stolen") : t("verify.status.suspect");

  return (
    <DashboardLayout title={t("history.title")}>
      <div className="max-w-4xl">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                <History size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{t("history.heading", { n: items.length })}</h2>
                <p className="text-sm text-muted-foreground">{t("history.subhead")}</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t("history.empty")}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      {icon(it.result)}
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground">{it.imei}</p>
                        <p className="text-xs text-muted-foreground">{new Date(it.checked_at).toLocaleString(locale)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{t("history.score", { n: it.risk_score })}</span>
                      <Badge variant={variant(it.result)}>{labelFor(it.result)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
