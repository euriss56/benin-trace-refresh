import { createFileRoute } from "@tanstack/react-router";
import { Shield, Target, Heart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "À propos — TraceIMEI-BJ" },
      { name: "description", content: "Découvrez la mission de TraceIMEI-BJ : sécuriser le marché des téléphones au Bénin." },
    ],
  }),
});

function AboutPage() {
  const { t } = useI18n();
  const blocks = [
    { icon: Target, title: t("about.vision.title"), desc: t("about.vision.desc") },
    { icon: Heart, title: t("about.values.title"), desc: t("about.values.desc") },
    { icon: Users, title: t("about.community.title"), desc: t("about.community.desc") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield size={14} /> {t("about.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
            {t("about.h1.prefix")} <span className="text-gradient-primary">{t("about.h1.accent")}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            {t("about.intro")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {blocks.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/50">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl gradient-primary text-primary-foreground mx-auto flex items-center justify-center mb-3">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardContent className="p-8 prose prose-sm max-w-none text-foreground">
            <h2 className="text-2xl font-bold mb-4">{t("about.how.title")}</h2>
            <p className="text-muted-foreground">{t("about.how.intro")}</p>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground mt-3">
              <li>{t("about.how.l1")}</li>
              <li>{t("about.how.l2")}</li>
              <li>{t("about.how.l3")}</li>
              <li>{t("about.how.l4")}</li>
              <li>{t("about.how.l5")}</li>
            </ol>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
