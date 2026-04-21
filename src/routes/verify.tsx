import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, AlertTriangle, CheckCircle2, ShieldAlert, Loader2, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isValidImei, lookupTac } from "@/lib/imei";
import { toast } from "sonner";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({ meta: [{ title: "Vérifier un IMEI — TraceIMEI-BJ" }] }),
});

type Result = {
  status: "safe" | "suspect" | "stolen";
  score: number;
  reasons: string[];
  device: { brand: string; model: string } | null;
  match?: { case_number: string; theft_date: string; city: string } | null;
};

function VerifyPage() {
  const { user } = useAuth();
  const [imei, setImei] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const handleVerify = async () => {
    setResult(null);
    if (!isValidImei(imei)) {
      toast.error("IMEI invalide. Vérifiez les 15 chiffres (algorithme Luhn).");
      return;
    }
    setLoading(true);
    const reasons: string[] = ["✓ Format IMEI 15 chiffres", "✓ Checksum Luhn valide"];

    const device = lookupTac(imei);
    if (device) reasons.push(`✓ Modèle identifié : ${device.brand} ${device.model}`);
    else reasons.push("⚠ TAC inconnu dans notre base");

    const { data: matches } = await supabase
      .from("stolen_phones")
      .select("case_number, theft_date, city, status")
      .eq("imei", imei)
      .limit(1);

    let status: Result["status"] = "safe";
    let score = device ? 5 : 25;
    let match = null;

    if (matches && matches.length > 0) {
      match = matches[0];
      status = "stolen";
      score = 95;
      reasons.push(`🚨 Téléphone signalé volé (dossier ${match.case_number})`);
    } else if (!device) {
      status = "suspect";
      score = 45;
      reasons.push("⚠ Vérifications complémentaires recommandées");
    }

    if (user) {
      await supabase.from("imei_checks").insert({
        user_id: user.id, imei, result: status, risk_score: score,
      });
    }

    setResult({ status, score, reasons, device, match });
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
                <p className="text-sm text-muted-foreground">Tapez <code className="px-1 py-0.5 bg-muted rounded">*#06#</code> sur le téléphone pour obtenir l'IMEI à 15 chiffres.</p>
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
              <Button onClick={handleVerify} disabled={loading || imei.length !== 15} className="gradient-primary text-primary-foreground h-11 sm:px-8 shadow-elegant">
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
    safe: { color: "border-success/40 bg-success/5", text: "text-success", icon: CheckCircle2, label: "Téléphone sain" },
    suspect: { color: "border-warning/50 bg-warning/5", text: "text-warning", icon: AlertTriangle, label: "Vérifications recommandées" },
    stolen: { color: "border-destructive/50 bg-destructive/5", text: "text-destructive", icon: ShieldAlert, label: "Téléphone signalé volé" },
  }[result.status];

  const Icon = config.icon;

  return (
    <Card className={`${config.color} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon className={config.text} size={28} />
          <div>
            <h3 className={`text-xl font-bold ${config.text}`}>{config.label}</h3>
            <p className="text-sm text-muted-foreground">Score de risque : {result.score}/100</p>
          </div>
        </div>

        {result.device && (
          <div className="flex items-center gap-2 text-sm text-foreground bg-card rounded-lg p-3 mb-4 border border-border">
            <Smartphone size={16} className="text-muted-foreground" />
            <span className="font-medium">{result.device.brand}</span>
            <span className="text-muted-foreground">·</span>
            <span>{result.device.model}</span>
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          {result.reasons.map((r, i) => (
            <p key={i} className="text-sm text-foreground">{r}</p>
          ))}
        </div>

        {result.match && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm">
            <p className="font-semibold text-destructive mb-1">Détails du signalement</p>
            <p className="text-foreground">Dossier : <span className="font-mono">{result.match.case_number}</span></p>
            <p className="text-foreground">Vol déclaré le {new Date(result.match.theft_date).toLocaleDateString("fr-FR")} à {result.match.city}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
