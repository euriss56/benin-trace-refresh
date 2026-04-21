import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Connexion — TraceIMEI-BJ" }],
  }),
});

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Au moins 6 caractères").max(128),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect" : error.message);
      return;
    }
    toast.success("Connexion réussie 🎉");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="benin-stripe" />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 justify-center mb-8">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <Shield className="text-primary-foreground" size={20} />
            </div>
            <span className="font-bold text-xl text-foreground">TraceIMEI-BJ</span>
          </Link>

          <Card className="border-border/60 shadow-elegant">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-1">Connexion</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Accédez à votre tableau de bord TraceIMEI.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-9" placeholder="vous@exemple.com" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative mt-1.5">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="pl-9" placeholder="••••••••" required />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-elegant h-11" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Se connecter"}
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground mt-6">
                Pas encore de compte ?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  S'inscrire
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
