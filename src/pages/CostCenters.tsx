import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";

const costCenterSchema = z.object({
  code: z.string().min(1, "Código é obrigatório").max(20),
  name: z.string().min(3, "Nome muito curto").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
});

type CostCenterFormValues = z.infer<typeof costCenterSchema>;

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export default function CostCenters() {
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    void loadCostCenters();
  }, []);

  const loadCostCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .order("code");

      if (error) throw error;

      setCostCenters((data || []) as CostCenter[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar centros de custo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: CostCenterFormValues) => {
    setSaving(true);
    try {
      if (editingCenter) {
        const { error } = await supabase
          .from("cost_centers")
          .update({
            code: values.code,
            name: values.name,
            description: values.description || null,
          })
          .eq("id", editingCenter.id);

        if (error) throw error;

        toast({
          title: "Centro de custo atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("cost_centers").insert({
          code: values.code,
          name: values.name,
          description: values.description || null,
        });

        if (error) throw error;

        toast({
          title: "Centro de custo criado",
          description: "O centro de custo foi cadastrado com sucesso.",
        });
      }

      form.reset();
      setEditingCenter(null);
      setDialogOpen(false);
      await loadCostCenters();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (center: CostCenter) => {
    setEditingCenter(center);
    form.reset({
      code: center.code,
      name: center.name,
      description: center.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este centro de custo?")) return;

    try {
      const { error } = await supabase.from("cost_centers").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Centro de custo excluído",
        description: "O registro foi removido com sucesso.",
      });

      await loadCostCenters();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centros de Custo</h1>
          <p className="text-muted-foreground">
            Organize suas despesas e receitas por departamentos ou projetos.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Centros de Custo</TabsTrigger>
            <TabsTrigger value="new">Novo Centro</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Cadastrar Centro de Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input id="code" placeholder="Ex: ADM, VND, TI" {...form.register("code")} />
                    {form.formState.errors.code && (
                      <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" placeholder="Ex: Administrativo" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o propósito deste centro de custo"
                      {...form.register("description")}
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-gold text-forest-green hover:bg-gold/90"
                    >
                      {saving ? "Salvando..." : "Cadastrar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Centros de Custo Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
                  </div>
                ) : costCenters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum centro de custo cadastrado. Use a aba "Novo Centro" para criar um.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costCenters.map((center) => (
                          <TableRow key={center.id}>
                            <TableCell className="font-medium">{center.code}</TableCell>
                            <TableCell>{center.name}</TableCell>
                            <TableCell>{center.description || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(center)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(center.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Centro de Custo</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Código</Label>
                <Input id="edit-code" {...form.register("code")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input id="edit-name" {...form.register("name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea id="edit-description" {...form.register("description")} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-gold text-forest-green hover:bg-gold/90">
                  {saving ? "Salvando..." : "Atualizar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}