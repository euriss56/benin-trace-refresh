import { Link } from "@tanstack/react-router";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher, ThemeToggle } from "@/components/HeaderControls";
import { useI18n } from "@/lib/i18n";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useI18n();

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
            <Button variant="ghost" size="sm">{t("nav.about")}</Button>
          </Link>
          <Link to="/verify">
            <Button variant="ghost" size="sm">{t("nav.verify")}</Button>
          </Link>
          <Link to="/privacy">
            <Button variant="ghost" size="sm">{t("nav.privacy")}</Button>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button size="sm" className="ml-2">{t("nav.dashboard")}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>{t("nav.logout")}</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">{t("nav.login")}</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="ml-1 shadow-elegant">{t("nav.register")}</Button>
              </Link>
            </>
          )}
          <div className="ml-2 flex items-center gap-1 border-l border-border pl-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            className="p-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-label={t("nav.menu")}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          <Link to="/about" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">{t("nav.about")}</Button></Link>
          <Link to="/verify" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">{t("nav.verify")}</Button></Link>
          <Link to="/privacy" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">{t("nav.privacy")}</Button></Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)}><Button className="w-full">{t("nav.dashboard")}</Button></Link>
              <Button variant="outline" className="w-full" onClick={() => { setOpen(false); signOut(); }}>{t("nav.logout")}</Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}><Button variant="ghost" className="w-full justify-start">{t("nav.login")}</Button></Link>
              <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full">{t("nav.register")}</Button></Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
