import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
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
          <p className="text-sm text-muted-foreground max-w-md">{t("footer.tagline")}</p>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm mb-3">{t("footer.platform")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/verify" className="hover:text-foreground">{t("footer.verify")}</Link></li>
            <li><Link to="/declare" className="hover:text-foreground">{t("footer.declare")}</Link></li>
            <li><Link to="/register" className="hover:text-foreground">{t("footer.register")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm mb-3">{t("footer.legal")}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">{t("footer.about")}</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("footer.made")}</p>
        </div>
      </div>
    </footer>
  );
}
