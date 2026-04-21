import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Msg { role: "user" | "assistant"; content: string }

const STARTER_REPLY =
  "Bonjour 👋 Je suis l'assistant TraceIMEI-BJ. Posez-moi vos questions sur la vérification d'IMEI, la déclaration de vol ou l'utilisation de la plateforme.";

const KB: { q: RegExp; a: string }[] = [
  { q: /imei|*#06/i, a: "Pour obtenir l'IMEI de votre téléphone, tapez *#06# sur le clavier d'appel. Vous obtiendrez un numéro à 15 chiffres." },
  { q: /vol|décla|signal/i, a: "Pour déclarer un vol, créez un compte puis allez dans 'Déclarer un vol'. Vous obtiendrez un numéro de dossier TP-BJ-... que vous pourrez transmettre à la police." },
  { q: /vérif|verify|check/i, a: "Sur la page 'Vérifier IMEI', saisissez les 15 chiffres. Le système valide via Luhn, identifie le modèle (TAC) puis croise avec la base des téléphones déclarés volés." },
  { q: /police|commiss/i, a: "Le tableau de bord enquêteur permet aux forces de l'ordre de consulter les déclarations. Les contacts des commissariats sont gérés par les administrateurs." },
  { q: /prix|coût|gratuit/i, a: "La vérification d'IMEI est gratuite pour tous. Les comptes dealers/réparateurs/enquêteurs sont également gratuits." },
  { q: /dealer|reven|technicien|atelier/i, a: "Si vous êtes dealer ou réparateur, choisissez le rôle correspondant à l'inscription pour accéder à un tableau de bord adapté." },
];

function reply(input: string): string {
  for (const k of KB) if (k.q.test(input)) return k.a;
  return "Je n'ai pas de réponse précise à cette question. Vous pouvez consulter la page 'À propos' ou contacter un administrateur. 🙏";
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: STARTER_REPLY }]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: reply(text) }]);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-glow flex items-center justify-center transition-transform hover:scale-105 ${open ? "hidden" : ""}`}
        aria-label="Ouvrir le chat"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-sm h-[520px] rounded-2xl bg-card border border-border shadow-glow flex flex-col overflow-hidden">
          <div className="px-4 py-3 gradient-primary text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Assistant TraceIMEI</p>
                <p className="text-xs opacity-80 mt-0.5">En ligne</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1 rounded hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-background/50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-border bg-card flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Votre question…"
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="icon" onClick={send} className="rounded-full">
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
