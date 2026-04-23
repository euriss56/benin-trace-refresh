
import { useEffect, useState } from "react";
import { Users, Mail, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  marche: string | null;
  type_activite: string | null;
  created_at: string;
}
interface RoleRow {
  user_id: string;
  role: AppRoleStr;
}

type AppRoleStr = "user" | "admin" | "dealer" | "technicien" | "enqueteur";

const ROLES: AppRoleStr[] = ["user", "dealer", "technicien", "enqueteur", "admin"];

function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRoleStr>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles(p ?? []);
    const m: Record<string, AppRoleStr> = {};
    (r as RoleRow[] | null)?.forEach((row) => {
      m[row.user_id] = row.role;
    });
    setRoles(m);
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (userId: string, newRole: AppRoleStr) => {
    if (currentUser?.id === userId) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    setUpdating(userId);
    try {
      // Delete existing roles for this user, then insert the new one (single role per user)
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (insErr) throw insErr;

      setRoles((prev) => ({ ...prev, [userId]: newRole }));
      toast.success(`Rôle mis à jour : ${newRole}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(`Impossible de changer le rôle : ${msg}`);
    } finally {
      setUpdating(null);
    }
  };

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
                <p className="text-sm text-muted-foreground">
                  Gérez les rôles directement depuis cette interface
                </p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {profiles.map((p) => {
                const isSelf = currentUser?.id === p.user_id;
                const currentRole = roles[p.user_id] ?? "dealer";
                return (
                  <div
                    key={p.id}
                    className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {p.name || "(sans nom)"} {isSelf && <span className="text-xs text-primary">(vous)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Mail size={12} /> {p.phone ?? "—"} · {p.marche ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      <div className="w-44">
                        <Select
                          value={currentRole}
                          onValueChange={(v) => changeRole(p.user_id, v as AppRoleStr)}
                          disabled={isSelf || updating === p.user_id}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {updating === p.user_id && (
                        <Loader2 className="animate-spin text-muted-foreground" size={16} />
                      )}
                    </div>
                  </div>
                );
              })}
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Aucun utilisateur.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AdminUsersPage;
