import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Users, FileText, Phone, Cpu, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin — TraceIMEI-BJ" }] }),
});

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, phones: 0, checks: 0, reports: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: u }, { count: p }, { count: c }, { count: r }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("stolen_phones").select("*", { count: "exact", head: true }),
        supabase.from("imei_checks").select("*", { count: "exact", head: true }),
        supabase.from("police_reports").select("*", { count: "exact", head: true }),
      ]);
      setStats({ users: u ?? 0, phones: p ?? 0, checks: c ?? 0, reports: r ?? 0 });
    })();
  }, []);

  const links = [
    { to: "/admin/users", icon: Users, label: "Utilisateurs", desc: "Gérer les comptes et rôles" },
    { to: "/admin/contacts", icon: Phone, label: "Contacts police", desc: "Gérer les commissariats" },
    { to: "/admin/ml", icon: Cpu, label: "ML Training", desc: "Entraîner et superviser le modèle" },
    { to: "/police-reports", icon: FileText, label: "Signalements", desc: "Consulter toutes les déclarations" },
  ];

  return (
    <DashboardLayout title="Administration" requireRoles={["admin"]}>
      <div className="max-w-5xl space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Utilisateurs", value: stats.users, icon: Users },
            { label: "Téléphones déclarés", value: stats.phones, icon: Shield },
            { label: "Vérifications IMEI", value: stats.checks, icon: Activity },
            { label: "Rapports police", value: stats.reports, icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Card className="border-border/50 hover:shadow-elegant transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Button variant="ghost" size="sm">Ouvrir</Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
