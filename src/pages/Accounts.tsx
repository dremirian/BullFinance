import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClient } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import { useCategorySuggestion } from "@/hooks/useCategorySuggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Pencil, Sparkles } from "lucide-react";

const accountSchema = z.object({
  type: z.enum(["receivable", "payable"], {
    required_error: "Informe o tipo de conta",
  }),
  expense_type: z.enum(["cost", "expense"]).optional(),
  category_id: z.string().optional().or(z.literal("")),
  description: z
    .string()
    .min(3, "Descrição muito curta")
    .max(200, "Descrição muito longa"),
  contact_name: z
    .string()
    .min(2, "Nome muito curto")
    .max(120, "Nome muito longo"),
  contact_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  contact_phone: z.string().max(30).optional().or(z.literal("")),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((val) => !Number.isNaN(Number(val.replace(",", "."))), {
      message: "Valor inválido",
    }),
  due_date: z.string().min(1, "Informe a data de vencimento"),
  payment_method: z
    .enum(["cash", "credit_card", "debit_card", "bank_transfer", "pix", "boleto", "check"])
    .optional(),
  cost_center_id: z.string().optional().or(z.literal("")),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface Account {
  id: string;
  type: "receivable" | "payable";
  status: "pending" | "paid" | "overdue" | "cancelled";
  description: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  payment_method: string | null;
}

interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export default function Accounts() {
  const { user } = useAuth();
  const { selectedClient } = useClient();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [paymentDate, setPaymentDate] = useState("");

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: "receivable",
      expense_type: undefined,
      category_id: "",
      description: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      amount: "",
      due_date: "",
      payment_method: undefined,
      cost_center_id: "",
    },
  });

  const watchType = form.watch("type");
  const watchContactName = form.watch("contact_name");
  const watchDescription = form.watch("description");

  const { suggestion, categories, loading: suggestingCategory } = useCategorySuggestion(
    selectedClient?.id,
    watchType,
    watchContactName,
    watchDescription
  );

  // Aplicar sugestão automaticamente quando disponível
  useEffect(() => {
    if (suggestion && suggestion.confidence > 0.7 && !form.getValues("category_id")) {
      form.setValue("category_id", suggestion.categoryId);
      if (suggestion.expenseType && watchType === "payable") {
        form.setValue("expense_type", suggestion.expenseType);
      }
    }
  }, [suggestion]);

  useEffect(() => {
    if (selectedClient) {
      void loadInitialData();
    }
  }, [selectedClient]);

  const loadInitialData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      const [accountsRes, costCentersRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("client_id", selectedClient.id)
          .order("due_date", { ascending: false }),
        supabase
          .from("cost_centers")
          .select("id, name, code")
          .eq("client_id", selectedClient.id)
          .order("name"),
      ]);

      if (accountsRes.error) {
        console.error("Erro ao carregar contas:", accountsRes.error);
        toast({
          title: "Erro ao carregar contas",
          description: accountsRes.error.message,
          variant: "destructive",
        });
      } else {
        setAccounts((accountsRes.data || []) as Account[]);
      }

      if (costCentersRes.error) {
        console.error("Erro ao carregar centros de custo:", costCentersRes.error);
      } else {
        setCostCenters((costCentersRes.data || []) as CostCenter[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: AccountFormValues) => {
    if (!user) return;
    if (!selectedClient) {
      toast({
        title: "Cliente não selecionado",
        description: "Selecione um cliente antes de cadastrar uma conta",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const amountNumber = Number(values.amount.replace(",", "."));

      const { error } = await supabase.from("accounts").insert({
        type: values.type,
        status: "pending",
        description: values.description,
        contact_name: values.contact_name,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        amount: amountNumber,
        due_date: values.due_date,
        payment_method: values.payment_method || null,
        cost_center_id: values.cost_center_id || null,
        expense_type: values.expense_type || null,
        category_id: values.category_id || null,
        created_by: user.id,
        client_id: selectedClient.id,
      });

      if (error) {
        console.error("Erro ao salvar conta:", error);
        toast({
          title: "Erro ao salvar conta",
          description:
            error.code === "42501"
              ? "Você não tem permissão para criar contas."
              : error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conta registrada",
        description: "A conta foi lançada com sucesso.",
      });

      form.reset();
      await loadInitialData();
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedAccount || !paymentDate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          status: "paid",
          payment_date: paymentDate,
        })
        .eq("id", selectedAccount.id);

      if (error) {
        console.error("Erro ao atualizar conta:", error);
        toast({
          title: "Erro ao atualizar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Atualizar o estado local imediatamente
      setAccounts(prevAccounts => 
        prevAccounts.map(acc => 
          acc.id === selectedAccount.id 
            ? { ...acc, status: "paid", payment_date: paymentDate } 
            : acc
        )
      );

      toast({
        title: "Conta atualizada",
        description: `${selectedAccount.type === 'receivable' ? 'Recebimento' : 'Pagamento'} registrado com sucesso.`,
      });

      setPaymentDialogOpen(false);
      setPaymentDate("");
      setSelectedAccount(null);
    } catch (error: any) {
      console.error("Erro ao atualizar conta:", error);
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAccount = async (accountId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ status: "cancelled" })
        .eq("id", accountId);

      if (error) {
        console.error("Erro ao cancelar conta:", error);
        toast({
          title: "Erro ao cancelar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Atualizar o estado local imediatamente
      setAccounts(prevAccounts => 
        prevAccounts.map(acc => 
          acc.id === accountId 
            ? { ...acc, status: "cancelled" } 
            : acc
        )
      );

      toast({
        title: "Conta cancelada",
        description: "Status alterado para cancelado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao cancelar conta:", error);
      toast({
        title: "Erro ao cancelar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditAccount = async (values: AccountFormValues) => {
    if (!selectedAccount) return;

    setSaving(true);
    try {
      const amountNumber = Number(values.amount.replace(",", "."));

      const { error } = await supabase
        .from("accounts")
        .update({
          type: values.type,
          description: values.description,
          contact_name: values.contact_name,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          amount: amountNumber,
          due_date: values.due_date,
          payment_method: values.payment_method || null,
          cost_center_id: values.cost_center_id || null,
        })
        .eq("id", selectedAccount.id);

      if (error) {
        toast({
          title: "Erro ao atualizar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conta atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedAccount(null);
      form.reset();
      await loadInitialData();
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    form.reset({
      type: account.type,
      description: account.description,
      contact_name: account.contact_name,
      contact_email: account.contact_email || "",
      contact_phone: account.contact_phone || "",
      amount: account.amount.toString(),
      due_date: account.due_date,
      payment_method: account.payment_method as any,
      cost_center_id: "",
    });
    setEditDialogOpen(true);
  };

  const openPaymentDialog = (account: Account) => {
    setSelectedAccount(account);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentDialogOpen(true);
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (typeFilter !== "all" && acc.type !== typeFilter) return false;
    if (statusFilter !== "all" && acc.status !== statusFilter) return false;
    return true;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusColor: Record<Account["status"], string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Contas a Pagar e Receber</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Cadastre contas de clientes e fornecedores, controle vencimentos e acompanhe sua carteira.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="list" className="text-sm sm:text-base">Lançamentos</TabsTrigger>
            <TabsTrigger value="new" className="text-sm sm:text-base">Nova Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            {!selectedClient ? (
              <Card className="border-border shadow-card">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    Selecione um cliente no menu lateral para cadastrar contas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border shadow-card">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Novo lançamento</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.watch("type")}
                      onValueChange={(val) => form.setValue("type", val as "receivable" | "payable")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receivable">Conta a receber</SelectItem>
                        <SelectItem value="payable">Conta a pagar</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.type && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.type.message}
                      </p>
                    )}
                  </div>

                  {watchType === "payable" && (
                    <div className="space-y-2">
                      <Label>Classificação</Label>
                      <Select
                        value={form.watch("expense_type") || undefined}
                        onValueChange={(val) => form.setValue("expense_type", val as "cost" | "expense")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cost">Custo (operação)</SelectItem>
                          <SelectItem value="expense">Despesa (administrativa)</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.expense_type && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.expense_type.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description" className="text-sm">Descrição</Label>
                    <Input id="description" {...form.register("description")} className="text-sm" />
                    {form.formState.errors.description && (
                      <p className="text-xs sm:text-sm text-destructive mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>Categoria (opcional)</Label>
                      {suggestingCategory && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Sugerindo...
                        </Badge>
                      )}
                      {suggestion && suggestion.confidence > 0.7 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Sugestão: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={form.watch("category_id") || undefined}
                      onValueChange={(val) => form.setValue("category_id", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                            {cat.expense_type && ` (${cat.expense_type === 'cost' ? 'Custo' : 'Despesa'})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma categoria disponível para este cliente
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Cliente / Fornecedor</Label>
                    <Input id="contact_name" {...form.register("contact_name")} />
                    {form.formState.errors.contact_name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.contact_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">E-mail</Label>
                    <Input id="contact_email" type="email" {...form.register("contact_email")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Telefone</Label>
                    <Input id="contact_phone" {...form.register("contact_phone")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
                    {form.formState.errors.amount && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.amount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Vencimento</Label>
                    <Input id="due_date" type="date" {...form.register("due_date")} />
                    {form.formState.errors.due_date && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.due_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select
                      value={form.watch("payment_method")}
                      onValueChange={(val) => form.setValue("payment_method", val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="bank_transfer">Transferência</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de débito</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Centro de custo (opcional)</Label>
                    <Select
                      value={form.watch("cost_center_id") || undefined}
                      onValueChange={(val) => form.setValue("cost_center_id", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione se aplicável" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.code} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {costCenters.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cadastre centros de custo primeiro
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 flex justify-end pt-2">
                    <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-gold text-forest-green hover:bg-gold/90 text-sm sm:text-base">
                      {saving ? "Salvando..." : "Lançar conta"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="list">
            <Card className="border-border shadow-card">
              <CardHeader className="flex flex-col gap-3 sm:gap-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Lançamentos</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground min-w-[40px]">Tipo:</span>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 sm:h-8 w-full sm:w-[160px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="receivable">A receber</SelectItem>
                        <SelectItem value="payable">A pagar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground min-w-[40px]">Status:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 sm:h-8 w-full sm:w-[160px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="paid">Pagas / Recebidas</SelectItem>
                        <SelectItem value="overdue">Vencidas</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-4 lg:px-6">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground px-2">
                    Nenhuma conta encontrada. Cadastre um novo lançamento na aba "Nova Conta".
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Tipo</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]">Descrição</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[120px] sm:min-w-[150px]">Cliente / Fornecedor</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Vencimento</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Valor</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm text-right whitespace-nowrap sticky right-0 bg-background">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAccounts.map((acc) => (
                          <TableRow key={acc.id}>
                            <TableCell className="text-xs sm:text-sm font-medium whitespace-nowrap">
                              {acc.type === "receivable" ? "A receber" : "A pagar"}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{acc.description}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{acc.contact_name}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                              {new Date(acc.due_date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium whitespace-nowrap">
                              {formatCurrency(Number(acc.amount))}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColor[acc.status]} text-[10px] sm:text-xs whitespace-nowrap`}>
                                {acc.status === "pending" && "Pendente"}
                                {acc.status === "paid" && "Pago/Recebido"}
                                {acc.status === "overdue" && "Vencido"}
                                {acc.status === "cancelled" && "Cancelado"}
                              </Badge>
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                {(acc.status === "pending" || acc.status === "overdue") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openPaymentDialog(acc)}
                                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8 p-0"
                                      title="Marcar como pago"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCancelAccount(acc.id)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                      title="Cancelar"
                                      disabled={saving}
                                    >
                                      <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(acc)}
                                  className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                                  title="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

        {/* Dialog para marcar como pago */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Marcar como Pago/Recebido</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Informe a data do pagamento para atualizar o status da conta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date" className="text-sm">Data do Pagamento</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              {selectedAccount && (
                <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <p><strong>Descrição:</strong> {selectedAccount.description}</p>
                  <p><strong>Valor:</strong> {formatCurrency(Number(selectedAccount.amount))}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(false)}
                className="w-full sm:w-auto text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={!paymentDate || saving}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                {saving ? "Salvando..." : "Confirmar Pagamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar conta */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Editar Conta</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Altere os dados da conta e salve as alterações.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleEditAccount)} className="grid gap-3 sm:gap-4 py-3 sm:py-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(val) => form.setValue("type", val as "receivable" | "payable")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Conta a receber</SelectItem>
                    <SelectItem value="payable">Conta a pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit_description" className="text-sm">Descrição</Label>
                <Input id="edit_description" {...form.register("description")} className="text-sm" />
                {form.formState.errors.description && (
                  <p className="text-xs sm:text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_contact_name">Cliente / Fornecedor</Label>
                <Input id="edit_contact_name" {...form.register("contact_name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_contact_email">E-mail</Label>
                <Input id="edit_contact_email" type="email" {...form.register("contact_email")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_contact_phone">Telefone</Label>
                <Input id="edit_contact_phone" {...form.register("contact_phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_amount">Valor</Label>
                <Input id="edit_amount" type="number" step="0.01" {...form.register("amount")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_due_date">Vencimento</Label>
                <Input id="edit_due_date" type="date" {...form.register("due_date")} />
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={form.watch("payment_method")}
                  onValueChange={(val) => form.setValue("payment_method", val as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de débito</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="sm:col-span-2 pt-3 sm:pt-4 flex-col sm:flex-row gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="w-full sm:w-auto text-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full sm:w-auto bg-gold text-forest-green hover:bg-gold/90 text-sm"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
