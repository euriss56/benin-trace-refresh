import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: "Utilisateurs — Admin TraceIMEI-BJ" }] }),
});

interface Profile { id: string; user_id: string; name: string; phone: string | null; marche: string | null; type_activite: string | null; created_at: string }
interface RoleRow { user_id: string; role: string }

function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setProfiles(p ?? []);
      const m: Record<string, string> = {};
      (r as RoleRow[] | null)?.forEach((row) => { m[row.user_id] = row.role; });
      setRoles(m);
    })();
  }, []);

  return (
    <DashboardLayout title="Utilisateurs" requireRoles={["admin"]}>
      <div className="max-w-5xl">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                <Users size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{profiles.length} utilisateurs</h2>
                <p className="text-sm text-muted-foreground">Liste de tous les comptes inscrits</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {profiles.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{p.name || "(sans nom)"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Mail size={12} /> {p.phone ?? "—"} · {p.marche ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                    <Badge variant="secondary" className="capitalize">{roles[p.user_id] ?? "—"}</Badge>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Aucun utilisateur.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
