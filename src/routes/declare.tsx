import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { FilePlus, Loader2, Upload, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isValidImei } from "@/lib/imei";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/declare")({
  component: DeclarePage,
  head: () => ({ meta: [{ title: "Déclarer un vol — TraceIMEI-BJ" }] }),
});

function genCaseNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `TP-BJ-${today}-${rand}`;
}

function DeclarePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    imei: "", brand: "", model: "", color: "",
    theft_date: new Date().toISOString().slice(0, 10),
    city: "", description: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const schema = z.object({
    imei: z.string().refine(isValidImei, t("declare.error.imei")),
    brand: z.string().trim().min(1).max(40),
    model: z.string().trim().min(1).max(60),
    color: z.string().trim().max(30).optional(),
    theft_date: z.string().min(1, t("declare.error.date")),
    city: z.string().trim().min(1).max(60),
    description: z.string().trim().max(500).optional(),
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(list);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);

    const photo_urls: string[] = [];
    for (const f of files) {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from("phone-photos").upload(path, f);
      if (!upErr) {
        const { data } = supabase.storage.from("phone-photos").getPublicUrl(path);
        photo_urls.push(data.publicUrl);
      }
    }

    const case_number = genCaseNumber();
    const { error } = await supabase.from("stolen_phones").insert({
      user_id: user.id, ...parsed.data, photo_urls, case_number, status: "stolen",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("declare.success", { case: case_number }));
    navigate("/police-reports");
  };

  return (
    <DashboardLayout title={t("declare.title")}>
      <div className="max-w-3xl">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <FilePlus size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{t("declare.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("declare.subhead")}</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="imei">{t("declare.f.imei")}</Label>
                <Input id="imei" value={form.imei} onChange={(e) => set("imei", e.target.value.replace(/\D/g, ""))} maxLength={15} className="font-mono mt-1.5" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="brand">{t("declare.f.brand")}</Label>
                  <Input id="brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Tecno, Samsung…" className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="model">{t("declare.f.model")}</Label>
                  <Input id="model" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Camon 19, Galaxy A52…" className="mt-1.5" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="color">{t("declare.f.color")}</Label>
                  <Input id="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="city">{t("declare.f.city")}</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cotonou" className="mt-1.5" required />
                </div>
              </div>
              <div>
                <Label htmlFor="theft_date">{t("declare.f.date")}</Label>
                <Input id="theft_date" type="date" value={form.theft_date} onChange={(e) => set("theft_date", e.target.value)} className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="desc">{t("declare.f.desc")}</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={500} className="mt-1.5" />
              </div>

              <div>
                <Label>{t("declare.f.photos")}</Label>
                <label className="mt-1.5 flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("declare.upload")}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="px-2 py-1 bg-muted rounded text-xs flex items-center gap-1">
                        {f.name}
                        <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11 shadow-elegant">
                {loading ? <Loader2 className="animate-spin" size={16} /> : t("declare.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
