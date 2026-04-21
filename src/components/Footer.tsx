import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="text-primary-foreground" size={18} />
            </div>
            <span className="font-bold text-foreground">TraceIMEI-BJ</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Première plateforme de traçabilité des téléphones volés au Bénin. Conçue pour les dealers,
            ateliers de réparation et forces de l'ordre.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm mb-3">Plateforme</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/verify" className="hover:text-foreground">Vérifier un IMEI</Link></li>
            <li><Link to="/declare" className="hover:text-foreground">Déclarer un vol</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm mb-3">Légal</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">À propos</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} TraceIMEI-BJ. Tous droits réservés.</p>
          <p>Fait avec ❤️ au Bénin 🇧🇯</p>
        </div>
      </div>
    </footer>
  );
}
