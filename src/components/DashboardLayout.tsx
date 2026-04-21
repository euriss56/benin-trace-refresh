import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import {
  Shield, LayoutDashboard, Search, FilePlus, History, Users, FileText,
  Phone, Cpu, LogOut, Menu, X, BadgeCheck, Wrench
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, type AppRole } from "@/hooks/useAuth";

interface NavItem { to: string; label: string; icon: typeof Shield; roles?: AppRole[] }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/verify", label: "Vérifier un IMEI", icon: Search },
  { to: "/declare", label: "Déclarer un vol", icon: FilePlus },
  { to: "/history", label: "Historique", icon: History },
  { to: "/dashboard/technicien", label: "Espace technicien", icon: Wrench, roles: ["technicien", "admin"] },
  { to: "/dashboard/enqueteur", label: "Espace enquêteur", icon: BadgeCheck, roles: ["enqueteur", "admin"] },
  { to: "/police-reports", label: "Mes signalements", icon: FileText },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["admin"] },
  { to: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["admin"] },
  { to: "/admin/contacts", label: "Contacts police", icon: Phone, roles: ["admin"] },
  { to: "/admin/ml", label: "ML Training", icon: Cpu, roles: ["admin"] },
];

export function DashboardLayout({ children, title, requireRoles }: { children: ReactNode; title: string; requireRoles?: AppRole[] }) {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && requireRoles && role && !requireRoles.includes(role)) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, role, requireRoles, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
            <Shield className="text-primary-foreground" size={18} />
          </div>
          <span className="font-bold text-sidebar-foreground">TraceIMEI-BJ</span>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "gradient-primary text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2 rounded-lg bg-sidebar-accent">
            <p className="text-xs text-sidebar-foreground/70">Connecté en tant que</p>
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user.email}</p>
            {role && <p className="text-xs text-primary mt-0.5 capitalize">{role}</p>}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut size={14} className="mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
              <span className="font-bold text-sidebar-foreground">Menu</span>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${active ? "gradient-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                    <Icon size={16} /> {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <Button variant="outline" className="w-full" onClick={signOut}>
                <LogOut size={14} className="mr-2" /> Déconnexion
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-muted" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-foreground">{title}</h1>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
