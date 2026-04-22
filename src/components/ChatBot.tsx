import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface Msg { role: "user" | "assistant"; content: string }

export function ChatBot() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Reset starter message when language changes
  useEffect(() => {
    setMsgs([{ role: "assistant", content: t("chat.starter") }]);
  }, [t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const reply = (input: string): string => {
    const KB: { q: RegExp; key: string }[] = [
      { q: /imei|\*#06/i, key: "chat.kb.imei" },
      { q: /vol|décla|signal|theft|report|robo|denun/i, key: "chat.kb.theft" },
      { q: /vérif|verify|check|verifi/i, key: "chat.kb.verify" },
      { q: /police|commiss|polic|esquadr/i, key: "chat.kb.police" },
      { q: /prix|coût|gratuit|price|cost|free|preço|grát|grati|precio/i, key: "chat.kb.price" },
      { q: /dealer|reven|technicien|atelier|repair|technic|distribu|reparad|reparac/i, key: "chat.kb.dealer" },
    ];
    for (const k of KB) if (k.q.test(input)) return t(k.key);
    return t("chat.fallback");
  };

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
        aria-label={t("chat.open")}
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
                <p className="text-sm font-semibold leading-none">{t("chat.title")}</p>
                <p className="text-xs opacity-80 mt-0.5">{t("chat.online")}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("chat.close")} className="p-1 rounded hover:bg-white/10">
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
              placeholder={t("chat.placeholder")}
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
