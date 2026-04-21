import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Confidentialité — TraceIMEI-BJ" },
      { name: "description", content: "Politique de confidentialité TraceIMEI-BJ : protection de vos données personnelles." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Lock size={14} /> Vos données sont protégées
          </div>
          <h1 className="text-4xl font-extrabold text-foreground">Politique de confidentialité</h1>
          <p className="text-muted-foreground mt-3">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">1. Données collectées</h2>
              <p>Nous collectons uniquement les données nécessaires au fonctionnement du service : email, mot de passe (chiffré), nom, téléphone, marché, type d'activité, IMEI vérifiés et déclarations effectuées.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">2. Finalités</h2>
              <p>Vos données servent à : authentifier votre compte, traiter vos déclarations, partager les téléphones volés avec les forces de l'ordre habilitées, améliorer notre modèle ML.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">3. Partage</h2>
              <p>Aucune donnée n'est vendue. Les déclarations de téléphones volés sont consultables par les enquêteurs habilités et les administrateurs de la plateforme.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">4. Sécurité</h2>
              <p>Authentification chiffrée, base de données protégée par Row-Level Security, communications HTTPS, photos stockées dans des buckets dédiés.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">5. Vos droits</h2>
              <p>Vous pouvez à tout moment consulter, modifier ou supprimer votre compte depuis votre tableau de bord. Pour toute question, contactez l'administrateur.</p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
