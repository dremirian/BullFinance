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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

const budgetSchema = z.object({
  name: z.string().min(3, "Nome muito curto").max(120),
  category: z.string().min(1, "Categoria obrigatória"),
  year: z.string().min(4, "Ano obrigatório"),
  month: z.string().optional(),
  planned_amount: z
    .string()
    .min(1, "Valor obrigatório")
    .refine((val) => !Number.isNaN(Number(val.replace(",", "."))), {
      message: "Valor inválido",
    }),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface Budget {
  id: string;
  name: string;
  category: string;
  year: number;
  month: number | null;
  planned_amount: number;
  actual_amount: number;
}

export default function Budgets() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: "",
      category: "",
      year: new Date().getFullYear().toString(),
      month: "",
      planned_amount: "",
    },
  });

  useEffect(() => {
    void loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: true });

      if (error) throw error;

      setBudgets((data || []) as Budget[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: BudgetFormValues) => {
    setSaving(true);
    try {
      const plannedAmount = Number(values.planned_amount.replace(",", "."));

      if (editingBudget) {
        const { error } = await supabase
          .from("budgets")
          .update({
            name: values.name,
            category: values.category,
            year: parseInt(values.year),
            month: values.month ? parseInt(values.month) : null,
            planned_amount: plannedAmount,
          })
          .eq("id", editingBudget.id);

        if (error) throw error;

        toast({
          title: "Orçamento atualizado",
          description: "O orçamento foi atualizado com sucesso.",
        });

        setDialogOpen(false);
        setEditingBudget(null);
      } else {
        const { error } = await supabase.from("budgets").insert({
          name: values.name,
          category: values.category,
          year: parseInt(values.year),
          month: values.month ? parseInt(values.month) : null,
          planned_amount: plannedAmount,
          actual_amount: 0,
        });

        if (error) throw error;

        toast({
          title: "Orçamento criado",
          description: "O orçamento foi cadastrado com sucesso.",
        });
      }

      form.reset();
      await loadBudgets();
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

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    form.reset({
      name: budget.name,
      category: budget.category,
      year: budget.year.toString(),
      month: budget.month?.toString() || "",
      planned_amount: budget.planned_amount.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;

    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi removido com sucesso.",
      });

      await loadBudgets();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const calculateProgress = (actual: number, planned: number) => {
    if (planned === 0) return 0;
    return Math.min((actual / planned) * 100, 100);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orçamento e Previsão</h1>
          <p className="text-muted-foreground">
            Planeje seus orçamentos e compare com os gastos reais.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Orçamentos</TabsTrigger>
            <TabsTrigger value="new">Novo Orçamento</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Criar Orçamento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Orçamento</Label>
                    <Input id="name" placeholder="Ex: Despesas Marketing Q1" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input id="category" placeholder="Ex: Marketing, Vendas" {...form.register("category")} />
                    {form.formState.errors.category && (
                      <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Input id="year" type="number" {...form.register("year")} />
                    {form.formState.errors.year && (
                      <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="month">Mês (opcional)</Label>
                    <Input id="month" type="number" min="1" max="12" placeholder="1-12" {...form.register("month")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planned_amount">Valor Planejado</Label>
                    <Input
                      id="planned_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("planned_amount")}
                    />
                    {form.formState.errors.planned_amount && (
                      <p className="text-sm text-destructive">{form.formState.errors.planned_amount.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-gold text-forest-green hover:bg-gold/90"
                    >
                      {saving ? "Salvando..." : "Criar Orçamento"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Orçamentos Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
                  </div>
                ) : budgets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum orçamento cadastrado. Use a aba "Novo Orçamento" para criar um.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {budgets.map((budget) => (
                      <Card key={budget.id} className="border-border">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 grid gap-4 md:grid-cols-2">
                              <div>
                                <h3 className="font-semibold text-lg">{budget.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {budget.category} • {budget.year}
                                  {budget.month && ` • ${monthNames[budget.month - 1]}`}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Planejado: {formatCurrency(budget.planned_amount)}</span>
                                  <span>Realizado: {formatCurrency(budget.actual_amount)}</span>
                                </div>
                                <Progress
                                  value={calculateProgress(budget.actual_amount, budget.planned_amount)}
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                  {calculateProgress(budget.actual_amount, budget.planned_amount).toFixed(1)}% utilizado
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(budget)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(budget.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Orçamento</Label>
                <Input id="edit-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria</Label>
                <Input id="edit-category" {...form.register("category")} />
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-year">Ano</Label>
                <Input id="edit-year" type="number" {...form.register("year")} />
                {form.formState.errors.year && (
                  <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-month">Mês (opcional)</Label>
                <Input id="edit-month" type="number" min="1" max="12" {...form.register("month")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-planned">Valor Planejado</Label>
                <Input id="edit-planned" type="number" step="0.01" {...form.register("planned_amount")} />
                {form.formState.errors.planned_amount && (
                  <p className="text-sm text-destructive">{form.formState.errors.planned_amount.message}</p>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingBudget(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gold text-forest-green hover:bg-gold/90"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}