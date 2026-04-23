
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

function PrivacyPage() {
  const { t, lang } = useI18n();
  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", pt: "pt-PT", es: "es-ES" };
  const locale = localeMap[lang] ?? "fr-FR";

  const sections = [
    { title: t("privacy.s1.title"), body: t("privacy.s1.body") },
    { title: t("privacy.s2.title"), body: t("privacy.s2.body") },
    { title: t("privacy.s3.title"), body: t("privacy.s3.body") },
    { title: t("privacy.s4.title"), body: t("privacy.s4.body") },
    { title: t("privacy.s5.title"), body: t("privacy.s5.body") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Lock size={14} /> {t("privacy.badge")}
          </div>
          <h1 className="text-4xl font-extrabold text-foreground">{t("privacy.h1")}</h1>
          <p className="text-muted-foreground mt-3">
            {t("privacy.lastUpdate", { date: new Date().toLocaleDateString(locale) })}
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-bold text-foreground mb-2">{s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

export default PrivacyPage;
