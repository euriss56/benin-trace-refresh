import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shield, Mail, Lock, User, Phone, Store, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Inscription — TraceIMEI-BJ" }] }),
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Au moins 6 caractères").max(128),
  phone: z.string().trim().min(8, "Téléphone invalide").max(20),
  role: z.enum(["dealer", "technicien", "enqueteur", "user"]),
  marche: z.string().trim().max(80).optional(),
  type_activite: z.string().trim().max(40).optional(),
});

const ROLE_OPTIONS = [
  { value: "dealer", label: "Dealer / Revendeur" },
  { value: "technicien", label: "Technicien / Réparateur" },
  { value: "enqueteur", label: "Enquêteur / Police" },
  { value: "user", label: "Particulier" },
];

const MARCHES = ["Dantokpa", "Ganhi", "St Michel", "Cotonou centre", "Porto-Novo", "Parakou", "Bohicon", "Autre"];

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    role: "dealer", marche: "Dantokpa", type_activite: "revente",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: parsed.data.role,
          marche: parsed.data.marche ?? "Autre",
          type_activite: parsed.data.type_activite ?? "revente",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Compte créé 🎉 Bienvenue sur TraceIMEI-BJ");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <Link to="/" className="flex items-center gap-3 justify-center mb-6">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <Shield className="text-primary-foreground" size={20} />
            </div>
            <span className="font-bold text-xl text-foreground">TraceIMEI-BJ</span>
          </Link>

          <Card className="border-border/60 shadow-elegant">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-1">Créer un compte</h1>
              <p className="text-sm text-muted-foreground mb-6">Inscription gratuite — accès immédiat.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <div className="relative mt-1.5">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className="pl-9" placeholder="Jean K." required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <div className="relative mt-1.5">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="pl-9" placeholder="+229 XX XX XX XX" required />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-9" placeholder="vous@exemple.com" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative mt-1.5">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="pl-9" placeholder="6 caractères minimum" required />
                  </div>
                </div>

                <div>
                  <Label>Profil</Label>
                  <Select value={form.role} onValueChange={(v) => set("role", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(form.role === "dealer" || form.role === "technicien") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Marché</Label>
                      <div className="relative mt-1.5">
                        <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                        <Select value={form.marche} onValueChange={(v) => set("marche", v)}>
                          <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MARCHES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Type d'activité</Label>
                      <Select value={form.type_activite} onValueChange={(v) => set("type_activite", v)}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revente">Revente</SelectItem>
                          <SelectItem value="reparation">Réparation</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-elegant h-11" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Créer mon compte"}
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground mt-6">
                Déjà un compte ?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
