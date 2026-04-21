import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Brain,
  Sparkles,
  Flag,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isValidImei, lookupTac } from "@/lib/imei";
import { predictRiskFn } from "@/lib/ml.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({ meta: [{ title: "Vérifier un IMEI — TraceIMEI-BJ" }] }),
});

type Status = "safe" | "suspect" | "stolen";

interface Result {
  status: Status;
  score: number; // 0-100
  source: "ml" | "fallback";
  reasons: string[];
  device: { brand: string; model: string; origin: string } | null;
  match?: { case_number: string; theft_date: string; city: string } | null;
  probabilities?: { legitimate: number; suspect: number; stolen: number };
  modelMeta?: { trained_at: string; accuracy: number; samples: number };
  imei: string;
  latencyMs: number;
}

function classifyFromMl(c: "legitimate" | "suspect" | "stolen"): Status {
  if (c === "stolen") return "stolen";
  if (c === "suspect") return "suspect";
  return "safe";
}

function VerifyPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const predictRisk = useServerFn(predictRiskFn);
  const [imei, setImei] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const handleVerify = async () => {
    setResult(null);
    if (!isValidImei(imei)) {
      toast.error(t("verify.invalid"));
      return;
    }
    setLoading(true);
    const startedAt = performance.now();

    const device = lookupTac(imei);

    // 1) Recherche signalement vol + historique vérifs (parallèle)
    const [stolenRes, checksRes] = await Promise.all([
      supabase
        .from("stolen_phones")
        .select("case_number, theft_date, city")
        .eq("imei", imei)
        .limit(1),
      supabase
        .from("imei_checks")
        .select("user_id, checked_at")
        .eq("imei", imei)
        .order("checked_at", { ascending: false })
        .limit(200),
    ]);

    const match = stolenRes.data?.[0] ?? null;
    const checks = checksRes.data ?? [];

    // 2) Appel ML
    let mlResult: Awaited<ReturnType<typeof predictRisk>> | null = null;
    try {
      mlResult = await predictRisk({
        data: {
          isValidLuhn: true,
          tacKnown: !!device,
          stolenReported: !!match,
          checks: checks.map((c) => ({
            user_id: c.user_id ?? null,
            checked_at: c.checked_at,
          })),
          cityCount: 1,
        },
      });
    } catch (err) {
      console.warn("ML predict failed, falling back:", err);
    }

    let final: Omit<Result, "imei" | "latencyMs">;

    if (mlResult && mlResult.available) {
      const status = classifyFromMl(mlResult.classification);
      final = {
        status,
        score: Math.round(mlResult.risk_score * 100),
        source: "ml",
        reasons: mlResult.reasons,
        device,
        match: match
          ? {
              case_number: match.case_number,
              theft_date: match.theft_date,
              city: match.city,
            }
          : null,
        probabilities: mlResult.probabilities,
        modelMeta: mlResult.model_meta,
      };
    } else {
      // Fallback : logique classique (Luhn + TAC + match base volés)
      const reasons: string[] = [
        "Format IMEI à 15 chiffres validé.",
        "Checksum Luhn correct.",
      ];
      if (device) reasons.push(`Modèle identifié : ${device.brand} ${device.model}.`);
      else reasons.push("Code TAC inconnu de notre base de référence.");

      let status: Status = "safe";
      let score = device ? 5 : 25;
      if (match) {
        status = "stolen";
        score = 95;
        reasons.unshift(`Téléphone signalé volé (dossier ${match.case_number}).`);
      } else if (!device) {
        status = "suspect";
        score = 45;
        reasons.push("Vérifications complémentaires recommandées.");
      }
      final = {
        status,
        score,
        source: "fallback",
        reasons,
        device,
        match: match
          ? {
              case_number: match.case_number,
              theft_date: match.theft_date,
              city: match.city,
            }
          : null,
      };
    }

    // 3) Log de la vérification (avec latence + source pour analytics)
    const latencyMs = Math.round(performance.now() - startedAt);
    if (user) {
      await supabase.from("imei_checks").insert({
        user_id: user.id,
        imei,
        result: final.status,
        risk_score: final.score,
        latency_ms: latencyMs,
        source: final.source,
        city: match?.city ?? null,
      });
    }

    setResult({ ...final, imei, latencyMs });
    setLoading(false);
  };

  return (
    <DashboardLayout title="Vérifier un IMEI">
      <div className="max-w-3xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Search size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Saisissez l'IMEI à vérifier</h2>
                <p className="text-sm text-muted-foreground">
                  Tapez <code className="px-1 py-0.5 bg-muted rounded">*#06#</code> sur le téléphone pour obtenir l'IMEI à 15 chiffres.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="imei" className="sr-only">IMEI</Label>
                <Input
                  id="imei"
                  inputMode="numeric"
                  maxLength={15}
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456789012345"
                  className="font-mono text-lg tracking-wider"
                />
                <p className="text-xs text-muted-foreground mt-1">{imei.length}/15 chiffres</p>
              </div>
              <Button
                onClick={handleVerify}
                disabled={loading || imei.length !== 15}
                className="gradient-primary text-primary-foreground h-11 sm:px-8 shadow-elegant"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Vérifier"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && <ResultCard result={result} />}
      </div>
    </DashboardLayout>
  );
}

function ResultCard({ result }: { result: Result }) {
  const config = {
    safe: {
      color: "border-success/40 bg-success/5",
      text: "text-success",
      badgeBg: "bg-success/15 text-success border-success/40",
      icon: CheckCircle2,
      label: "LÉGITIME",
      progress: "bg-success",
    },
    suspect: {
      color: "border-warning/50 bg-warning/5",
      text: "text-warning",
      badgeBg: "bg-warning/15 text-warning border-warning/40",
      icon: AlertTriangle,
      label: "SUSPECT",
      progress: "bg-warning",
    },
    stolen: {
      color: "border-destructive/50 bg-destructive/5",
      text: "text-destructive",
      badgeBg: "bg-destructive/15 text-destructive border-destructive/40",
      icon: ShieldAlert,
      label: "VOLÉ",
      progress: "bg-destructive",
    },
  }[result.status];

  const Icon = config.icon;
  const blacklistStatus = result.match
    ? "Blacklisté"
    : result.status === "suspect"
    ? "À vérifier"
    : "Non blacklisté";

  return (
    <Card className={`${config.color} border-2`}>
      <CardContent className="p-6">
        {/* 1. Badge statut centré */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm tracking-wider ${config.badgeBg}`}
          >
            <Icon size={18} />
            {config.label}
          </div>
          <Badge
            variant={result.source === "ml" ? "default" : "secondary"}
            className="gap-1 text-xs"
          >
            {result.source === "ml" ? <Brain size={11} /> : <Sparkles size={11} />}
            {result.source === "ml" ? "Analyse IA" : "Analyse classique"}
          </Badge>
        </div>

        {/* 2. Grille 2x2 : Marque / Modèle / Pays / Blacklist */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <InfoTile label="Marque" value={result.device?.brand ?? "Inconnue"} />
          <InfoTile label="Modèle" value={result.device?.model ?? "Inconnu"} />
          <InfoTile label="Pays d'origine" value={result.device?.origin ?? "Inconnu"} />
          <InfoTile
            label="Statut blacklist"
            value={blacklistStatus}
            valueClass={
              result.match
                ? "text-destructive"
                : result.status === "suspect"
                ? "text-warning"
                : "text-success"
            }
          />
        </div>

        {/* 3. Barre Score de risque */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Score de risque</span>
            <span className={`text-sm font-bold ${config.text}`}>{result.score}/100</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${config.progress} transition-all`}
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>

        {result.probabilities && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <ProbBar label="Légitime" value={result.probabilities.legitimate} variant="success" />
            <ProbBar label="Suspect" value={result.probabilities.suspect} variant="warning" />
            <ProbBar label="Volé" value={result.probabilities.stolen} variant="destructive" />
          </div>
        )}

        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pourquoi ce résultat ?
          </p>
          {result.reasons.map((r, i) => (
            <p key={i} className="text-sm text-foreground flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{r}</span>
            </p>
          ))}
        </div>

        {result.match && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm mb-4">
            <p className="font-semibold text-destructive mb-1">Détails du signalement</p>
            <p className="text-foreground">
              Dossier : <span className="font-mono">{result.match.case_number}</span>
            </p>
            <p className="text-foreground">
              Vol déclaré le {new Date(result.match.theft_date).toLocaleDateString("fr-FR")} à {result.match.city}
            </p>
          </div>
        )}

        {/* 4. Temps de réponse + bouton Signaler */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} />
            <span>Temps de réponse : <span className="font-mono font-semibold text-foreground">{result.latencyMs} ms</span></span>
          </div>
          {result.status !== "stolen" && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Link to="/declare">
                <Flag size={14} className="mr-1" />
                Signaler comme volé
              </Link>
            </Button>
          )}
        </div>

        {result.modelMeta && (
          <p className="text-xs text-muted-foreground pt-3 mt-3 border-t border-border">
            Modèle entraîné le {new Date(result.modelMeta.trained_at).toLocaleDateString("fr-FR")} sur{" "}
            {result.modelMeta.samples.toLocaleString("fr-FR")} échantillons — précision{" "}
            {(result.modelMeta.accuracy * 100).toFixed(1)}%.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoTile({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ProbBar({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "destructive";
}) {
  const colorClass =
    variant === "success" ? "bg-success" : variant === "warning" ? "bg-warning" : "bg-destructive";
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{(value * 100).toFixed(0)}%</p>
      <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
