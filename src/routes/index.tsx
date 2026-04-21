import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, Search, Smartphone, CheckCircle, ArrowRight, Zap,
  ShoppingBag, Wrench, BadgeCheck, BarChart3, Lock, Users, Globe2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TraceIMEI-BJ — Vérifiez et déclarez les téléphones volés au Bénin" },
      { name: "description", content: "Plateforme ML de traçabilité des téléphones volés au Bénin. Vérification IMEI gratuite, déclarations sécurisées, accès police." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <div className="benin-stripe" />
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Shield size={14} />
            Authentifier · Protéger · Tracer
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
            TraceIMEI-BJ —{" "}
            <span className="text-gradient-primary">Protégez vos téléphones</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            La première plateforme ML de traçabilité des téléphones volés au Bénin.
            Pour dealers, ateliers de réparation et forces de l'ordre.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/verify">
              <Button size="lg" className="gradient-primary text-primary-foreground hover:opacity-90 px-8 shadow-elegant h-12 text-base">
                Vérifier un IMEI gratuitement
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base border-border/60">
                Créer un compte
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto pt-8">
            {[
              { value: "10,9M", label: "Abonnés mobiles (ARCEP 2025)" },
              { value: "Luhn", label: "Validation IMEI standard" },
              { value: "< 2s", label: "Temps de réponse moyen" },
              { value: "Open", label: "Modèle en apprentissage continu" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-accent-foreground uppercase tracking-wider mb-2">Processus simple</p>
            <h2 className="text-3xl font-bold text-foreground">Comment ça marche ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Smartphone, title: "Saisissez l'IMEI", desc: "Tapez *#06# sur le téléphone pour obtenir le numéro IMEI à 15 chiffres" },
              { icon: Zap, title: "Analyse transparente", desc: "Validation Luhn, lookup TAC, recoupement avec les déclarations de vol — chaque règle est expliquée" },
              { icon: CheckCircle, title: "Résultat immédiat", desc: "Statut tricolore (vert/orange/rouge) avec score 0-100 et explications détaillées" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Card key={title} className="border-border/50 hover:shadow-elegant transition-all hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">ÉTAPE {i + 1}</div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Conçu pour vous</p>
            <h2 className="text-3xl font-bold text-foreground">Une plateforme pour chaque acteur</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShoppingBag, role: "Dealer / Revendeur", desc: "Vérifiez en 2 secondes l'historique d'un téléphone avant l'achat. Évitez d'acheter du matériel volé." },
              { icon: Wrench, role: "Atelier de réparation", desc: "Identifiez les téléphones suspects avant intervention. Protégez votre activité et vos clients." },
              { icon: BadgeCheck, role: "Forces de l'ordre", desc: "Accès enquêteur dédié pour consulter les déclarations et coordonner les enquêtes." },
            ].map(({ icon: Icon, role, desc }) => (
              <Card key={role} className="border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
                    <Icon size={26} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{role}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground">Pourquoi TraceIMEI-BJ ?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: "Données chiffrées", desc: "Authentification sécurisée et stockage chiffré" },
              { icon: BarChart3, title: "Score ML", desc: "Algorithme apprenant en continu" },
              { icon: Search, title: "Lookup TAC", desc: "Identification précise du modèle" },
              { icon: Globe2, title: "100% Bénin", desc: "Conçu pour le marché béninois" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-card border border-border mx-auto flex items-center justify-center mb-3 text-primary">
                  <Icon size={22} />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-6">
            <Users size={14} />
            Rejoignez la communauté
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Prêt à sécuriser le marché des téléphones au Bénin ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Inscription gratuite. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-elegant h-12 px-8">
                Créer mon compte
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link to="/verify">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Tester maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
