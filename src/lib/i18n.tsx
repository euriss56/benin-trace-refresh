import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "fr" | "en" | "pt";

export const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "pt", flag: "🇵🇹", label: "PT" },
];

type Dict = Record<string, string>;

const fr: Dict = {
  // Navbar
  "nav.about": "À propos",
  "nav.verify": "Vérifier IMEI",
  "nav.privacy": "Confidentialité",
  "nav.dashboard": "Tableau de bord",
  "nav.logout": "Déconnexion",
  "nav.login": "Connexion",
  "nav.register": "S'inscrire",
  "nav.menu": "Menu",
  "nav.theme.light": "Mode clair",
  "nav.theme.dark": "Mode sombre",
  "nav.lang": "Langue",
  // Verify
  "verify.title": "Vérifier un IMEI",
  "verify.heading": "Saisissez l'IMEI à vérifier",
  "verify.help": "Tapez *#06# sur le téléphone pour obtenir l'IMEI à 15 chiffres.",
  "verify.button": "Vérifier",
  "verify.invalid": "IMEI invalide. Vérifiez les 15 chiffres (algorithme Luhn).",
  "verify.digits": "{count}/15 chiffres",
  "verify.status.safe": "LÉGITIME",
  "verify.status.suspect": "SUSPECT",
  "verify.status.stolen": "VOLÉ",
  "verify.source.ml": "Analyse IA",
  "verify.source.fallback": "Analyse classique",
  "verify.field.brand": "Marque",
  "verify.field.model": "Modèle",
  "verify.field.origin": "Pays d'origine",
  "verify.field.blacklist": "Statut blacklist",
  "verify.blacklist.yes": "Blacklisté",
  "verify.blacklist.check": "À vérifier",
  "verify.blacklist.no": "Non blacklisté",
  "verify.unknown": "Inconnu",
  "verify.score": "Score de risque",
  "verify.prob.legitimate": "Légitime",
  "verify.prob.suspect": "Suspect",
  "verify.prob.stolen": "Volé",
  "verify.why": "Pourquoi ce résultat ?",
  "verify.report.title": "Détails du signalement",
  "verify.report.case": "Dossier :",
  "verify.report.date": "Vol déclaré le {date} à {city}",
  "verify.latency": "Temps de réponse :",
  "verify.action.report": "Signaler comme volé",
  "verify.model.meta": "Modèle entraîné le {date} sur {samples} échantillons — précision {accuracy}%.",
  // Common
  "common.loading": "Chargement…",
};

const en: Dict = {
  "nav.about": "About",
  "nav.verify": "Verify IMEI",
  "nav.privacy": "Privacy",
  "nav.dashboard": "Dashboard",
  "nav.logout": "Sign out",
  "nav.login": "Sign in",
  "nav.register": "Sign up",
  "nav.menu": "Menu",
  "nav.theme.light": "Light mode",
  "nav.theme.dark": "Dark mode",
  "nav.lang": "Language",
  "verify.title": "Verify an IMEI",
  "verify.heading": "Enter the IMEI to verify",
  "verify.help": "Dial *#06# on the phone to get the 15-digit IMEI.",
  "verify.button": "Verify",
  "verify.invalid": "Invalid IMEI. Check the 15 digits (Luhn algorithm).",
  "verify.digits": "{count}/15 digits",
  "verify.status.safe": "LEGITIMATE",
  "verify.status.suspect": "SUSPICIOUS",
  "verify.status.stolen": "STOLEN",
  "verify.source.ml": "AI analysis",
  "verify.source.fallback": "Classic analysis",
  "verify.field.brand": "Brand",
  "verify.field.model": "Model",
  "verify.field.origin": "Country of origin",
  "verify.field.blacklist": "Blacklist status",
  "verify.blacklist.yes": "Blacklisted",
  "verify.blacklist.check": "To verify",
  "verify.blacklist.no": "Not blacklisted",
  "verify.unknown": "Unknown",
  "verify.score": "Risk score",
  "verify.prob.legitimate": "Legitimate",
  "verify.prob.suspect": "Suspicious",
  "verify.prob.stolen": "Stolen",
  "verify.why": "Why this result?",
  "verify.report.title": "Report details",
  "verify.report.case": "Case:",
  "verify.report.date": "Theft reported on {date} in {city}",
  "verify.latency": "Response time:",
  "verify.action.report": "Report as stolen",
  "verify.model.meta": "Model trained on {date} with {samples} samples — accuracy {accuracy}%.",
  "common.loading": "Loading…",
};

const pt: Dict = {
  "nav.about": "Sobre",
  "nav.verify": "Verificar IMEI",
  "nav.privacy": "Privacidade",
  "nav.dashboard": "Painel",
  "nav.logout": "Sair",
  "nav.login": "Entrar",
  "nav.register": "Cadastrar",
  "nav.menu": "Menu",
  "nav.theme.light": "Modo claro",
  "nav.theme.dark": "Modo escuro",
  "nav.lang": "Idioma",
  "verify.title": "Verificar um IMEI",
  "verify.heading": "Insira o IMEI a verificar",
  "verify.help": "Disque *#06# no telefone para obter o IMEI de 15 dígitos.",
  "verify.button": "Verificar",
  "verify.invalid": "IMEI inválido. Verifique os 15 dígitos (algoritmo de Luhn).",
  "verify.digits": "{count}/15 dígitos",
  "verify.status.safe": "LEGÍTIMO",
  "verify.status.suspect": "SUSPEITO",
  "verify.status.stolen": "ROUBADO",
  "verify.source.ml": "Análise IA",
  "verify.source.fallback": "Análise clássica",
  "verify.field.brand": "Marca",
  "verify.field.model": "Modelo",
  "verify.field.origin": "País de origem",
  "verify.field.blacklist": "Status na lista negra",
  "verify.blacklist.yes": "Na lista negra",
  "verify.blacklist.check": "A verificar",
  "verify.blacklist.no": "Fora da lista negra",
  "verify.unknown": "Desconhecido",
  "verify.score": "Pontuação de risco",
  "verify.prob.legitimate": "Legítimo",
  "verify.prob.suspect": "Suspeito",
  "verify.prob.stolen": "Roubado",
  "verify.why": "Por que esse resultado?",
  "verify.report.title": "Detalhes da denúncia",
  "verify.report.case": "Processo:",
  "verify.report.date": "Roubo relatado em {date} em {city}",
  "verify.latency": "Tempo de resposta:",
  "verify.action.report": "Denunciar como roubado",
  "verify.model.meta": "Modelo treinado em {date} com {samples} amostras — precisão {accuracy}%.",
  "common.loading": "Carregando…",
};

const DICTS: Record<Lang, Dict> = { fr, en, pt };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "tracimei.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && DICTS[stored]) return stored;
  const nav = window.navigator.language?.slice(0, 2).toLowerCase();
  if (nav === "en") return "en";
  if (nav === "pt") return "pt";
  return "fr";
}

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  // Hydrate after mount to avoid SSR mismatch
  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[lang] ?? fr;
      const raw = dict[key] ?? fr[key] ?? key;
      return format(raw, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
