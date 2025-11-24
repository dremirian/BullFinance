import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User, Phone, Mail, MapPin, DollarSign, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  credit_limit: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  credit_limit: number;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export default function Customers() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerStats, setCustomerStats] = useState<Record<string, { total: number; overdue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (selectedClient) {
      loadCustomers();
      loadCustomerStats();
    }
  }, [selectedClient]);

  const loadCustomers = async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerStats = async () => {
    if (!selectedClient) return;
    try {
      const { data: accounts } = await supabase
        .from("accounts")
        .select("customer_id, amount, status, due_date")
        .eq("client_id", selectedClient.id)
        .eq("type", "receivable")
        .not("customer_id", "is", null);

      if (accounts) {
        const stats: Record<string, { total: number; overdue: number }> = {};
        accounts.forEach((acc) => {
          if (!acc.customer_id) return;
          if (!stats[acc.customer_id]) {
            stats[acc.customer_id] = { total: 0, overdue: 0 };
          }
          if (acc.status === "pending") {
            stats[acc.customer_id].total += Number(acc.amount);
            if (new Date(acc.due_date) < new Date()) {
              stats[acc.customer_id].overdue += Number(acc.amount);
            }
          }
        });
        setCustomerStats(stats);
      }
    } catch (error) {
      console.error("Error loading customer stats:", error);
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    if (!selectedClient) return;

    try {
      const formData = {
        ...data,
        credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : 0,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", editingCustomer.id);

        if (error) throw error;
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([{ ...formData, client_id: selectedClient.id }] as any);

        if (error) throw error;
        toast({ title: "Cliente criado com sucesso!" });
      }

      setDialogOpen(false);
      setEditingCustomer(null);
      reset();
      loadCustomers();
      loadCustomerStats();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    reset({
      name: customer.name,
      document: customer.document || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      contact_person: customer.contact_person || "",
      credit_limit: customer.credit_limit?.toString() || "0",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Cliente excluído com sucesso!" });
      loadCustomers();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Selecione um cliente no menu lateral
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os clientes de {selectedClient.name}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              reset({});
              setDialogOpen(true);
            }}
            className="bg-secondary text-secondary-foreground hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {customers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Comece cadastrando seu primeiro cliente para gerenciar suas contas a receber e receitas.
              </p>
              <Button
                onClick={() => {
                  setEditingCustomer(null);
                  reset({});
                  setDialogOpen(true);
                }}
                className="bg-secondary text-secondary-foreground hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => {
              const stats = customerStats[customer.id] || { total: 0, overdue: 0 };
              const hasOverdue = stats.overdue > 0;

              return (
                <Card key={customer.id} className="border-border shadow-card">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <CardTitle className="text-lg">{customer.name}</CardTitle>
                        {customer.document && (
                          <p className="text-sm text-muted-foreground">{customer.document}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customer.contact_person && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Contato:</span>
                        <span className="text-muted-foreground">{customer.contact_person}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{customer.email}</span>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Limite de Crédito:</span>
                        <span className="font-semibold">{formatCurrency(customer.credit_limit)}</span>
                      </div>
                      {stats.total > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">A Receber:</span>
                            <span className="font-semibold text-primary">{formatCurrency(stats.total)}</span>
                          </div>
                          {hasOverdue && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Em Atraso:</span>
                              <Badge variant="destructive" className="text-xs">
                                {formatCurrency(stats.overdue)}
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Nome do cliente"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">CPF/CNPJ</Label>
                  <Input
                    id="document"
                    {...register("document")}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="email@exemplo.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_person">Pessoa de Contato</Label>
                  <Input
                    id="contact_person"
                    {...register("contact_person")}
                    placeholder="Nome do contato principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Limite de Crédito (R$)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    step="0.01"
                    {...register("credit_limit")}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Notas adicionais sobre o cliente"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingCustomer(null);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary text-secondary-foreground hover:opacity-90">
                  {editingCustomer ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
