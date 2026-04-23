import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/technicien")({
  component: TechnicienPage,
  head: () => ({ meta: [{ title: "Espace technicien — TraceIMEI-BJ" }] }),
});

function TechnicienPage() {
  const { t } = useI18n();
  return (
    <DashboardLayout title={t("tech.title")} requireRoles={["technicien", "admin"]}>
      <div className="max-w-4xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                <Wrench size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{t("tech.welcome")}</h2>
                <p className="text-sm text-muted-foreground">{t("tech.intro")}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/verify"><Button className="w-full gradient-primary text-primary-foreground"><Search size={16} className="mr-2" /> {t("tech.action.verify")}</Button></Link>
              <Link to="/declare"><Button variant="outline" className="w-full border-destructive/40 text-destructive"><AlertTriangle size={16} className="mr-2" /> {t("tech.action.report")}</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-3">{t("tech.best.title")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t("tech.best.l1")}</li>
              <li>• {t("tech.best.l2")}</li>
              <li>• {t("tech.best.l3")}</li>
              <li>• {t("tech.best.l4")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
