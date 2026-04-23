
import { useEffect, useState } from "react";
import { Cpu, Play, Loader2, TrendingUp, Brain, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { trainModel, getModelStatus } from "@/lib/ml-client";

interface LogRow {
  id: string;
  model_name: string;
  accuracy: number | null;
  loss: number | null;
  epochs: number;
  training_samples: number;
  duration_seconds: number | null;
  status: string;
  created_at: string;
}

interface ModelInfo {
  exists: boolean;
  trained_at?: string;
  accuracy?: number;
  f1_macro?: number;
  samples?: number;
}

function AdminMLPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [training, setTraining] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({ exists: false });

  const loadLogs = () =>
    supabase
      .from("ml_training_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs(data ?? []));

  const loadModelInfo = async () => {
    try {
      const info = await getModelStatus();
      setModelInfo(info);
    } catch {
      setModelInfo({ exists: false });
    }
  };

  useEffect(() => {
    loadLogs();
    loadModelInfo();
  }, []);

  const runTraining = async () => {
    setTraining(true);
    toast.info("Entraînement en cours… (génération de 100 000 échantillons + Random Forest + Isolation Forest)");
    try {
      const res = await trainModel({ samples: 100_000, trees: 60 });
      toast.success(
        `Modèle entraîné — précision ${(res.accuracy * 100).toFixed(1)}% (F1 ${(res.f1_macro * 100).toFixed(1)}%) en ${res.duration_seconds.toFixed(1)}s`
      );
      await Promise.all([loadLogs(), loadModelInfo()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'entraînement";
      toast.error(msg);
    } finally {
      setTraining(false);
    }
  };

  return (
    <DashboardLayout title="ML Training" requireRoles={["admin"]}>
      <div className="max-w-5xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">imei-risk-rf-iso</h2>
                  <p className="text-sm text-muted-foreground">
                    Random Forest (60 arbres) + Isolation Forest entraînés sur 100 000 échantillons synthétiques
                    réalistes (distribution 70% légitime / 20% suspect / 10% volé).
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">8 features</Badge>
                    <Badge variant="outline" className="text-xs">Random Forest multi-classe</Badge>
                    <Badge variant="outline" className="text-xs">Isolation Forest (anomalies)</Badge>
                    <Badge variant="outline" className="text-xs">Inférence &lt; 2s</Badge>
                  </div>
                </div>
              </div>
              <Button
                onClick={runTraining}
                disabled={training}
                className="gradient-primary text-primary-foreground shadow-elegant"
              >
                {training ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Play className="mr-2" size={16} />
                )}
                {training ? "Entraînement…" : "Lancer un entraînement"}
              </Button>
            </div>

            {modelInfo.exists && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                <Stat
                  label="Précision"
                  value={`${((modelInfo.accuracy ?? 0) * 100).toFixed(1)}%`}
                  hi
                />
                <Stat label="F1 macro" value={`${((modelInfo.f1_macro ?? 0) * 100).toFixed(1)}%`} />
                <Stat
                  label="Échantillons"
                  value={(modelInfo.samples ?? 0).toLocaleString("fr-FR")}
                />
                <Stat
                  label="Entraîné le"
                  value={
                    modelInfo.trained_at
                      ? new Date(modelInfo.trained_at).toLocaleDateString("fr-FR")
                      : "—"
                  }
                />
              </div>
            )}

            {!modelInfo.exists && !training && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-warning flex items-center gap-2">
                  <Cpu size={14} />
                  Aucun modèle entraîné. La vérification IMEI utilise actuellement la logique classique
                  (Luhn + TAC + base des téléphones volés).
                </p>
              </div>
            )}

            {modelInfo.exists && (
              <div className="mt-4 flex items-center gap-2 text-sm text-success">
                <CheckCircle2 size={14} />
                Modèle actif — utilisé en priorité par /verify, fallback automatique sur logique classique si indisponible.
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
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucun entraînement pour l'instant.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((l) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">{l.model_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        acc {((l.accuracy ?? 0) * 100).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">
                        {l.training_samples.toLocaleString("fr-FR")} samples
                      </span>
                      <span className="text-muted-foreground">
                        {(l.duration_seconds ?? 0).toFixed(1)}s
                      </span>
                      <Badge variant={l.status === "completed" ? "default" : "secondary"}>
                        {l.status}
                      </Badge>
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

export default Stat;
