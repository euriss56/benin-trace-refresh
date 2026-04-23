
import { useEffect, useState } from "react";
import { FileText, MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface Phone {
  id: string; case_number: string; imei: string; brand: string; model: string;
  color: string | null; theft_date: string; city: string; status: string;
  description: string | null; photo_urls: string[] | null;
}

function PoliceReportsPage() {
  const { user, role } = useAuth();
  const { t, lang } = useI18n();
  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", pt: "pt-PT", es: "es-ES" };
  const locale = localeMap[lang] ?? "fr-FR";
  const [items, setItems] = useState<Phone[]>([]);

  useEffect(() => {
    if (!user) return;
    let q = supabase.from("stolen_phones").select("*").order("created_at", { ascending: false });
    if (role !== "enqueteur" && role !== "admin") q = q.eq("user_id", user.id);
    q.limit(100).then(({ data }) => setItems(data ?? []));
  }, [user, role]);

  return (
    <DashboardLayout title={t("reports.title")}>
      <div className="max-w-5xl">
        {items.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <FileText size={32} className="mx-auto mb-3 opacity-50" />
              <p>{t("reports.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((p) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{p.case_number}</p>
                      <h3 className="font-bold text-foreground">{p.brand} {p.model}</h3>
                    </div>
                    <Badge variant={p.status === "stolen" ? "destructive" : "secondary"}>
                      {p.status === "stolen" ? t("verify.status.stolen") : p.status}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm text-foreground mb-3">{p.imei}</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar size={14} /> {new Date(p.theft_date).toLocaleDateString(locale)}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} /> {p.city}</div>
                    {p.color && <div>{t("reports.color")} {p.color}</div>}
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-3 italic">"{p.description}"</p>}
                  {p.photo_urls && p.photo_urls.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {p.photo_urls.map((u, i) => (
                        <img key={i} src={u} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded border border-border" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default PoliceReportsPage;
