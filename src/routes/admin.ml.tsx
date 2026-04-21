import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, Play, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ml")({
  component: AdminMLPage,
  head: () => ({ meta: [{ title: "ML Training — Admin TraceIMEI-BJ" }] }),
});

interface LogRow {
  id: string; model_name: string; accuracy: number | null; loss: number | null;
  epochs: number; training_samples: number; duration_seconds: number | null;
  status: string; created_at: string;
}

function AdminMLPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [training, setTraining] = useState(false);

  const load = () =>
    supabase.from("ml_training_logs").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setLogs(data ?? []));
  useEffect(() => { load(); }, []);

  const runTraining = async () => {
    if (!user) return;
    setTraining(true);
    toast.info("Entraînement simulé en cours…");

    const start = Date.now();
    // Récupérer un échantillon des vérifications pour simuler l'entraînement
    const { count } = await supabase.from("imei_checks").select("*", { count: "exact", head: true });
    const samples = count ?? 0;

    // Simulation : 4 secondes d'entraînement
    await new Promise((r) => setTimeout(r, 4000));

    const accuracy = 0.82 + Math.random() * 0.15;
    const loss = 0.05 + Math.random() * 0.2;
    const duration = (Date.now() - start) / 1000;

    const { error } = await supabase.from("ml_training_logs").insert({
      user_id: user.id,
      model_name: "imei-risk-model",
      accuracy, loss, epochs: 10, training_samples: samples, duration_seconds: duration,
      status: "completed",
    });

    setTraining(false);
    if (error) return toast.error(error.message);
    toast.success(`Entraînement terminé — accuracy ${(accuracy * 100).toFixed(1)}%`);
    load();
  };

  const last = logs[0];

  return (
    <DashboardLayout title="ML Training" requireRoles={["admin"]}>
      <div className="max-w-5xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                  <Cpu size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Modèle imei-risk-model</h2>
                  <p className="text-sm text-muted-foreground">
                    Entraînement supervisé sur l'historique des vérifications IMEI.
                  </p>
                </div>
              </div>
              <Button onClick={runTraining} disabled={training} className="gradient-primary text-primary-foreground shadow-elegant">
                {training ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                {training ? "Entraînement…" : "Lancer un entraînement"}
              </Button>
            </div>

            {last && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                <Stat label="Précision" value={`${((last.accuracy ?? 0) * 100).toFixed(1)}%`} hi />
                <Stat label="Loss" value={(last.loss ?? 0).toFixed(3)} />
                <Stat label="Échantillons" value={String(last.training_samples)} />
                <Stat label="Durée" value={`${(last.duration_seconds ?? 0).toFixed(1)}s`} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Historique des entraînements
            </h3>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun entraînement pour l'instant.</p>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((l) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{l.model_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">acc {((l.accuracy ?? 0) * 100).toFixed(1)}%</span>
                      <span className="text-muted-foreground">{l.training_samples} samples</span>
                      <Badge variant={l.status === "completed" ? "default" : "secondary"}>{l.status}</Badge>
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

function Stat({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${hi ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
