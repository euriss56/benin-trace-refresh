
import { useEffect, useState, type FormEvent } from "react";
import { Phone, Plus, Trash2, MapPin, Mail } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

interface Contact { id: string; city: string; commissioner_name: string; phone: string; email: string | null; address: string | null }

const schema = z.object({
  city: z.string().trim().min(1).max(60),
  commissioner_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional(),
});

function AdminContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [form, setForm] = useState({ city: "", commissioner_name: "", phone: "", email: "", address: "" });

  const load = () => supabase.from("police_contacts").select("*").order("city").then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.from("police_contacts").insert({
      ...parsed.data,
      email: parsed.data.email || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Contact ajouté");
    setForm({ city: "", commissioner_name: "", phone: "", email: "", address: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("police_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contact supprimé");
    load();
  };

  return (
    <DashboardLayout title="Contacts police" requireRoles={["admin"]}>
      <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center">
                <Phone size={18} />
              </div>
              <h2 className="font-bold text-foreground">{items.length} commissariats</h2>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucun contact enregistré.</p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((c) => (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{c.commissioner_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> {c.city}{c.address ? ` — ${c.address}` : ""}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>
                        {c.email && <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span>}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 size={16} className="text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 h-fit">
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus size={16} className="text-primary" /> Nouveau contact
            </h3>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1" required /></div>
              <div><Label>Nom du commissaire</Label><Input value={form.commissioner_name} onChange={(e) => set("commissioner_name", e.target.value)} className="mt-1" required /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" /></div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} className="mt-1" /></div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Ajouter</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AdminContactsPage;
