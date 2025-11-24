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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const bankAccountSchema = z.object({
  name: z.string().min(3, "Nome muito curto").max(120),
  bank_name: z.string().min(2, "Nome do banco obrigatório").max(120),
  agency: z.string().max(20).optional().or(z.literal("")),
  account_number: z.string().min(1, "Número da conta obrigatório").max(30),
  account_type: z.string().min(1, "Tipo obrigatório"),
  initial_balance: z.string().refine((val) => !Number.isNaN(Number(val.replace(",", "."))), {
    message: "Valor inválido",
  }),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  agency: string | null;
  account_number: string;
  account_type: string;
  initial_balance: number;
  current_balance: number;
  active: boolean;
}

export default function BankAccounts() {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: "",
      bank_name: "",
      agency: "",
      account_number: "",
      account_type: "checking",
      initial_balance: "0",
    },
  });

  useEffect(() => {
    void loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name");

      if (error) throw error;

      setBankAccounts((data || []) as BankAccount[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contas bancárias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: BankAccountFormValues) => {
    setSaving(true);
    try {
      const balanceNumber = Number(values.initial_balance.replace(",", "."));

      if (editingAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update({
            name: values.name,
            bank_name: values.bank_name,
            agency: values.agency || null,
            account_number: values.account_number,
            account_type: values.account_type,
            initial_balance: balanceNumber,
            current_balance: balanceNumber,
          })
          .eq("id", editingAccount.id);

        if (error) throw error;

        toast({
          title: "Conta atualizada",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("bank_accounts").insert({
          name: values.name,
          bank_name: values.bank_name,
          agency: values.agency || null,
          account_number: values.account_number,
          account_type: values.account_type,
          initial_balance: balanceNumber,
          current_balance: balanceNumber,
        });

        if (error) throw error;

        toast({
          title: "Conta bancária criada",
          description: "A conta foi cadastrada com sucesso.",
        });
      }

      form.reset();
      setEditingAccount(null);
      setDialogOpen(false);
      await loadBankAccounts();
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

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    form.reset({
      name: account.name,
      bank_name: account.bank_name,
      agency: account.agency || "",
      account_number: account.account_number,
      account_type: account.account_type,
      initial_balance: account.initial_balance.toString(),
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas Bancárias</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e acompanhe saldos.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Contas Bancárias</TabsTrigger>
            <TabsTrigger value="new">Nova Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Cadastrar Conta Bancária</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input id="name" placeholder="Ex: Conta Corrente Principal" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Banco</Label>
                    <Input id="bank_name" placeholder="Ex: Banco do Brasil" {...form.register("bank_name")} />
                    {form.formState.errors.bank_name && (
                      <p className="text-sm text-destructive">{form.formState.errors.bank_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input id="agency" placeholder="Ex: 1234-5" {...form.register("agency")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Número da Conta</Label>
                    <Input id="account_number" placeholder="Ex: 12345-6" {...form.register("account_number")} />
                    {form.formState.errors.account_number && (
                      <p className="text-sm text-destructive">{form.formState.errors.account_number.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <Select
                      value={form.watch("account_type")}
                      onValueChange={(val) => form.setValue("account_type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Conta Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                        <SelectItem value="investment">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initial_balance">Saldo Inicial</Label>
                    <Input
                      id="initial_balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("initial_balance")}
                    />
                    {form.formState.errors.initial_balance && (
                      <p className="text-sm text-destructive">{form.formState.errors.initial_balance.message}</p>
                    )}
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
                <CardTitle>Contas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta bancária cadastrada. Use a aba "Nova Conta" para criar uma.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Banco</TableHead>
                          <TableHead>Agência</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Saldo Atual</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>{account.bank_name}</TableCell>
                            <TableCell>{account.agency || "-"}</TableCell>
                            <TableCell>{account.account_number}</TableCell>
                            <TableCell>
                              {account.account_type === "checking" && "Corrente"}
                              {account.account_type === "savings" && "Poupança"}
                              {account.account_type === "investment" && "Investimento"}
                            </TableCell>
                            <TableCell>{formatCurrency(Number(account.current_balance))}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(account)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
              <DialogTitle>Editar Conta Bancária</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Conta</Label>
                <Input id="edit-name" {...form.register("name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bank_name">Banco</Label>
                <Input id="edit-bank_name" {...form.register("bank_name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-agency">Agência</Label>
                <Input id="edit-agency" {...form.register("agency")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-account_number">Número da Conta</Label>
                <Input id="edit-account_number" {...form.register("account_number")} />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <Select
                  value={form.watch("account_type")}
                  onValueChange={(val) => form.setValue("account_type", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-initial_balance">Saldo Inicial</Label>
                <Input
                  id="edit-initial_balance"
                  type="number"
                  step="0.01"
                  {...form.register("initial_balance")}
                />
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