import { createFileRoute } from "@tanstack/react-router";
import { Shield, Target, Heart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield size={14} /> Notre mission
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
            Sécuriser le marché des <span className="text-gradient-primary">téléphones au Bénin</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            TraceIMEI-BJ est née d'un constat simple : trop de téléphones volés circulent sur le marché béninois.
            Nous donnons aux acteurs honnêtes les outils pour vérifier et déclarer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Target, title: "Vision", desc: "Un marché du téléphone d'occasion 100% transparent au Bénin d'ici 2030." },
            { icon: Heart, title: "Valeurs", desc: "Transparence des règles, respect de la vie privée, accessibilité gratuite." },
            { icon: Users, title: "Communauté", desc: "Dealers, réparateurs, police et particuliers travaillent ensemble." },
          ].map(({ icon: Icon, title, desc }) => (
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
            <h2 className="text-2xl font-bold mb-4">Comment fonctionne TraceIMEI-BJ ?</h2>
            <p className="text-muted-foreground">
              Chaque téléphone GSM possède un identifiant unique : l'IMEI (15 chiffres, obtenu en tapant <code>*#06#</code>).
              Notre système :
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Valide</strong> l'IMEI avec l'algorithme Luhn (standard international).</li>
              <li><strong className="text-foreground">Identifie</strong> le modèle via le TAC (8 premiers chiffres).</li>
              <li><strong className="text-foreground">Croise</strong> l'IMEI avec les déclarations de vol enregistrées.</li>
              <li><strong className="text-foreground">Calcule</strong> un score de risque 0-100 et fournit un statut tricolore.</li>
              <li><strong className="text-foreground">Apprend</strong> en continu : notre modèle ML s'améliore avec chaque vérification.</li>
            </ol>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
