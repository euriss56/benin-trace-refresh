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
  WifiOff,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isValidImei, lookupTac } from "@/lib/imei";
import { predictRiskFn } from "@/lib/ml.functions";
import { flaskPredictFn } from "@/lib/flask-ml.functions";
import {
  cacheImeiCheck,
  getCachedImeiCheck,
  isOnline,
  type CachedCheck,
} from "@/lib/imei-cache";
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
  source: "flask" | "ml" | "fallback";
  reasons: string[];
  device: { brand: string; model: string; origin: string } | null;
  match?: { case_number: string; theft_date: string; city: string } | null;
  probabilities?: { legitimate: number; suspect: number; stolen: number };
  modelMeta?: { trained_at: string; accuracy: number; samples: number };
  imei: string;
  latencyMs: number;
  fromCache?: { cachedAt: number };
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
  const flaskPredict = useServerFn(flaskPredictFn);
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

    // Mode hors-ligne : si offline, on saute direct au cache
    if (!isOnline()) {
      const cached = await getCachedImeiCheck(imei);
      if (cached) {
        setResult({
          status: cached.status,
          score: cached.score,
          source: cached.source,
          reasons: cached.reasons,
          device: cached.device,
          imei,
          latencyMs: 0,
          fromCache: { cachedAt: cached.cachedAt },
        });
        toast.info(t("verify.offline.toast"));
      } else {
        toast.error(t("verify.offline.miss"));
      }
      setLoading(false);
      return;
    }

    try {
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

      // 2) Tentative API Flask externe en priorité
      let flaskResult: Awaited<ReturnType<typeof flaskPredict>> | null = null;
      try {
        flaskResult = await flaskPredict({ data: { imei } });
      } catch (err) {
        console.warn("Flask predict failed:", err);
      }

      let final: Omit<Result, "imei" | "latencyMs">;

      if (flaskResult && flaskResult.available) {
        // Si match local en base volés, on force le statut stolen
        const status: Status = match
          ? "stolen"
          : classifyFromMl(flaskResult.classification);
        const score = match
          ? 95
          : Math.round(flaskResult.risk_score * 100);
        const reasons: string[] = [];
        if (match) reasons.push(`Téléphone signalé volé (dossier ${match.case_number}).`);
        if (flaskResult.message) reasons.push(flaskResult.message);
        if (device) reasons.push(`Modèle identifié : ${device.brand} ${device.model}.`);
        else reasons.push("Code TAC inconnu de notre base de référence.");

        final = {
          status,
          score,
          source: "flask",
          reasons,
          device,
          match: match
            ? { case_number: match.case_number, theft_date: match.theft_date, city: match.city }
            : null,
        };
      } else {
        // 3) Fallback ML local
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
          console.warn("ML local predict failed:", err);
        }

        if (mlResult && mlResult.available) {
          const status = classifyFromMl(mlResult.classification);
          final = {
            status,
            score: Math.round(mlResult.risk_score * 100),
            source: "ml",
            reasons: mlResult.reasons,
            device,
            match: match
              ? { case_number: match.case_number, theft_date: match.theft_date, city: match.city }
              : null,
            probabilities: mlResult.probabilities,
            modelMeta: mlResult.model_meta,
          };
        } else {
          // 4) Fallback ultime : règles métier
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
              ? { case_number: match.case_number, theft_date: match.theft_date, city: match.city }
              : null,
          };
        }
      }

      // 5) Log + cache IndexedDB
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

      const cacheEntry: CachedCheck = {
        imei,
        status: final.status,
        score: final.score,
        source: final.source,
        reasons: final.reasons,
        device: final.device,
        cachedAt: Date.now(),
      };
      await cacheImeiCheck(cacheEntry);

      setResult({ ...final, imei, latencyMs });
    } catch (err) {
      console.error("verify failed:", err);
      // Réseau KO en cours de route → tente le cache
      const cached = await getCachedImeiCheck(imei);
      if (cached) {
        setResult({
          status: cached.status,
          score: cached.score,
          source: cached.source,
          reasons: cached.reasons,
          device: cached.device,
          imei,
          latencyMs: 0,
          fromCache: { cachedAt: cached.cachedAt },
        });
        toast.warning(t("verify.offline.toast"));
      } else {
        toast.error(t("verify.network.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title={t("verify.title")}>
      <div className="max-w-3xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Search size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{t("verify.heading")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("verify.help")}
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
                <p className="text-xs text-muted-foreground mt-1">{t("verify.digits", { count: imei.length })}</p>
              </div>
              <Button
                onClick={handleVerify}
                disabled={loading || imei.length !== 15}
                className="gradient-primary text-primary-foreground h-11 sm:px-8 shadow-elegant"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : t("verify.button")}
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
  const { t, lang } = useI18n();
  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", pt: "pt-PT" };
  const locale = localeMap[lang] ?? "fr-FR";

  const config = {
    safe: {
      color: "border-success/40 bg-success/5",
      text: "text-success",
      badgeBg: "bg-success/15 text-success border-success/40",
      icon: CheckCircle2,
      label: t("verify.status.safe"),
      progress: "bg-success",
    },
    suspect: {
      color: "border-warning/50 bg-warning/5",
      text: "text-warning",
      badgeBg: "bg-warning/15 text-warning border-warning/40",
      icon: AlertTriangle,
      label: t("verify.status.suspect"),
      progress: "bg-warning",
    },
    stolen: {
      color: "border-destructive/50 bg-destructive/5",
      text: "text-destructive",
      badgeBg: "bg-destructive/15 text-destructive border-destructive/40",
      icon: ShieldAlert,
      label: t("verify.status.stolen"),
      progress: "bg-destructive",
    },
  }[result.status];

  const Icon = config.icon;
  const blacklistStatus = result.match
    ? t("verify.blacklist.yes")
    : result.status === "suspect"
    ? t("verify.blacklist.check")
    : t("verify.blacklist.no");

  return (
    <Card className={`${config.color} border-2`}>
      <CardContent className="p-6">
        {result.fromCache && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground text-xs">
            <WifiOff size={14} className="text-warning shrink-0" />
            <span className="text-foreground">
              {t("verify.offline.banner", {
                date: new Date(result.fromCache.cachedAt).toLocaleString(locale),
              })}
            </span>
          </div>
        )}
        {/* 1. Badge statut centré */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm tracking-wider ${config.badgeBg}`}
          >
            <Icon size={18} />
            {config.label}
          </div>
          <Badge
            variant={result.source === "fallback" ? "secondary" : "default"}
            className="gap-1 text-xs"
          >
            {result.source === "flask" ? (
              <Brain size={11} />
            ) : result.source === "ml" ? (
              <Brain size={11} />
            ) : (
              <Sparkles size={11} />
            )}
            {result.source === "flask"
              ? t("verify.source.flask")
              : result.source === "ml"
                ? t("verify.source.ml")
                : t("verify.source.fallback")}
          </Badge>
        </div>

        {/* 2. Grille 2x2 : Marque / Modèle / Pays / Blacklist */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <InfoTile label={t("verify.field.brand")} value={result.device?.brand ?? t("verify.unknown")} />
          <InfoTile label={t("verify.field.model")} value={result.device?.model ?? t("verify.unknown")} />
          <InfoTile label={t("verify.field.origin")} value={result.device?.origin ?? t("verify.unknown")} />
          <InfoTile
            label={t("verify.field.blacklist")}
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
            <span className="text-sm font-semibold text-foreground">{t("verify.score")}</span>
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
            <ProbBar label={t("verify.prob.legitimate")} value={result.probabilities.legitimate} variant="success" />
            <ProbBar label={t("verify.prob.suspect")} value={result.probabilities.suspect} variant="warning" />
            <ProbBar label={t("verify.prob.stolen")} value={result.probabilities.stolen} variant="destructive" />
          </div>
        )}

        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("verify.why")}
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
            <p className="font-semibold text-destructive mb-1">{t("verify.report.title")}</p>
            <p className="text-foreground">
              {t("verify.report.case")} <span className="font-mono">{result.match.case_number}</span>
            </p>
            <p className="text-foreground">
              {t("verify.report.date", {
                date: new Date(result.match.theft_date).toLocaleDateString(locale),
                city: result.match.city,
              })}
            </p>
          </div>
        )}

        {/* 4. Temps de réponse + bouton Signaler */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} />
            <span>{t("verify.latency")} <span className="font-mono font-semibold text-foreground">{result.latencyMs} ms</span></span>
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
                {t("verify.action.report")}
              </Link>
            </Button>
          )}
        </div>

        {result.modelMeta && (
          <p className="text-xs text-muted-foreground pt-3 mt-3 border-t border-border">
            {t("verify.model.meta", {
              date: new Date(result.modelMeta.trained_at).toLocaleDateString(locale),
              samples: result.modelMeta.samples.toLocaleString(locale),
              accuracy: (result.modelMeta.accuracy * 100).toFixed(1),
            })}
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
