import { Link } from "@tanstack/react-router";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-30 border-b border-border/50 bg-card/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
            <Shield className="text-primary-foreground" size={18} />
          </div>
          <div>
            <span className="font-bold text-base text-foreground tracking-tight">TraceIMEI-BJ</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link to="/about">
            <Button variant="ghost" size="sm">À propos</Button>
          </Link>
          <Link to="/verify">
            <Button variant="ghost" size="sm">Vérifier IMEI</Button>
          </Link>
          <Link to="/privacy">
            <Button variant="ghost" size="sm">Confidentialité</Button>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button size="sm" className="ml-2">Tableau de bord</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>Déconnexion</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Connexion</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="ml-1 shadow-elegant">S'inscrire</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          <Link to="/about" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">À propos</Button></Link>
          <Link to="/verify" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">Vérifier IMEI</Button></Link>
          <Link to="/privacy" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">Confidentialité</Button></Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)}><Button className="w-full">Tableau de bord</Button></Link>
              <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut(); }}>Déconnexion</Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">Connexion</Button></Link>
              <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full">S'inscrire</Button></Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
