import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  cnpj: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  created_at: string;
  logo_url?: string | null;
  cnpj?: string | null;
}

export default function Clients() {
  const [clients, setLocalClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { setClients } = useClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;

      setLocalClients(data || []);
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: ClientFormValues) {
    try {
      setSaving(true);

      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update({
            name: values.name,
            document: values.document || null,
            email: values.email || null,
            phone: values.phone || null,
            address: values.address || null,
          })
          .eq("id", editingClient.id);

        if (error) throw error;

        toast({
          title: "Cliente atualizado com sucesso!",
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { error } = await supabase.from("clients").insert([
          {
            name: values.name,
            document: values.document || null,
            email: values.email || null,
            phone: values.phone || null,
            address: values.address || null,
            created_by: user.id,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Cliente cadastrado com sucesso!",
        });
      }

      reset();
      setEditingClient(null);
      setDialogOpen(false);
      loadClients();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(client: Client) {
    setEditingClient(client);
    setValue("name", client.name);
    setValue("document", client.document || "");
    setValue("email", client.email || "");
    setValue("phone", client.phone || "");
    setValue("address", client.address || "");
    setDialogOpen(true);
  }

  async function handleDelete(clientId: string) {
    if (!confirm("Tem certeza que deseja desativar este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({ active: false })
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Cliente desativado com sucesso!",
      });

      loadClients();
    } catch (error: any) {
      toast({
        title: "Erro ao desativar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes do sistema
          </p>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">Novo Cliente</TabsTrigger>
            <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar Novo Cliente</CardTitle>
                <CardDescription>
                  Preencha os dados do cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input id="name" {...register("name")} />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document">CPF/CNPJ</Label>
                      <Input id="document" {...register("document")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" {...register("phone")} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Textarea id="address" {...register("address")} />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Cadastrar Cliente"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  Clientes cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Carregando...</p>
                ) : clients.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.document || "-"}</TableCell>
                          <TableCell>{client.email || "-"}</TableCell>
                          <TableCell>{client.phone || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(client)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(client.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os dados do cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input id="edit-name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-document">CPF/CNPJ</Label>
                <Input id="edit-document" {...register("document")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" {...register("email")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input id="edit-phone" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Endereço</Label>
                <Textarea id="edit-address" {...register("address")} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingClient(null);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
