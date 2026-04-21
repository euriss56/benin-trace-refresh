import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/dashboard/technicien")({
  component: TechnicienPage,
  head: () => ({ meta: [{ title: "Espace technicien — TraceIMEI-BJ" }] }),
});

function TechnicienPage() {
  return (
    <DashboardLayout title="Espace technicien" requireRoles={["technicien", "admin"]}>
      <div className="max-w-4xl space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                <Wrench size={18} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Bienvenue, technicien</h2>
                <p className="text-sm text-muted-foreground">
                  Avant chaque intervention, vérifiez systématiquement l'IMEI du téléphone pour éviter de réparer du matériel volé.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/verify"><Button className="w-full gradient-primary text-primary-foreground"><Search size={16} className="mr-2" /> Vérifier un IMEI</Button></Link>
              <Link to="/declare"><Button variant="outline" className="w-full border-destructive/40 text-destructive"><AlertTriangle size={16} className="mr-2" /> Signaler un téléphone suspect</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-3">Bonnes pratiques</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Demandez systématiquement la facture d'achat ou la preuve de propriété.</li>
              <li>• Vérifiez l'IMEI affiché vs celui imprimé sous la batterie / dans les paramètres.</li>
              <li>• En cas de doute, refusez la réparation et signalez via la plateforme.</li>
              <li>• Conservez l'historique de vos vérifications comme preuve de diligence.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
