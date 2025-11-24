import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, ArrowRightLeft, FileText } from "lucide-react";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  status: string;
  matched_account_id: string | null;
}

interface Account {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  type: string;
  status: string;
}

export default function BankReconciliation() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient]);

  const loadData = async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      
      // Carregar transações bancárias não conciliadas
      const { data: transData, error: transError } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("client_id", selectedClient.id)
        .eq("status", "pending")
        .order("transaction_date", { ascending: false });

      if (transError) {
        console.error("Erro ao carregar transações:", transError);
      }

      // Carregar contas não pagas
      const { data: acctData, error: acctError } = await supabase
        .from("accounts")
        .select("*")
        .eq("client_id", selectedClient.id)
        .eq("status", "pending")
        .order("due_date", { ascending: false });

      if (acctError) {
        console.error("Erro ao carregar contas:", acctError);
      }

      setTransactions(transData || []);
      setAccounts(acctData || []);
    } catch (error: any) {
      console.error("Erro geral ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    try {
      setUploading(true);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        // Parse CSV simples
        const lines = text.split('\n').slice(1); // Pular cabeçalho
        const parsedTransactions = lines
          .filter(line => line.trim())
          .map(line => {
            const [date, description, amount, balance] = line.split(',');
            return {
              transaction_date: date?.trim(),
              description: description?.trim() || 'Sem descrição',
              amount: parseFloat(amount?.replace(/[^0-9.-]/g, '') || '0'),
              balance_after: parseFloat(balance?.replace(/[^0-9.-]/g, '') || '0'),
            };
          });

        // Obter banco selecionado (assumindo primeiro banco do cliente)
        const { data: bankAccounts } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("client_id", selectedClient.id)
          .eq("active", true)
          .limit(1);

        if (!bankAccounts || bankAccounts.length === 0) {
          toast({
            title: "Erro",
            description: "Nenhuma conta bancária ativa encontrada",
            variant: "destructive",
          });
          return;
        }

        // Inserir transações
        const transactionsToInsert = parsedTransactions.map(t => ({
          ...t,
          bank_account_id: bankAccounts[0].id,
          client_id: selectedClient.id,
          status: 'pending',
        }));

        const { error } = await supabase
          .from("bank_transactions")
          .insert(transactionsToInsert as any);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: `${parsedTransactions.length} transações importadas`,
        });

        loadData();
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const matchTransaction = async (transactionId: string, accountId: string) => {
    try {
      // Atualizar transação
      const { error: transError } = await supabase
        .from("bank_transactions")
        .update({
          status: "reconciled",
          matched_account_id: accountId,
        })
        .eq("id", transactionId);

      if (transError) throw transError;

      // Atualizar conta para paga
      const { error: acctError } = await supabase
        .from("accounts")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", accountId);

      if (acctError) throw acctError;

      toast({ title: "Conciliação realizada com sucesso!" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const ignoreTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("bank_transactions")
        .update({ status: "ignored" })
        .eq("id", transactionId);

      if (error) throw error;
      toast({ title: "Transação ignorada" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao ignorar transação",
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
            <h1 className="text-3xl font-bold text-foreground">Conciliação Bancária</h1>
            <p className="text-muted-foreground mt-1">
              Concilie transações bancárias com contas a pagar/receber
            </p>
          </div>
          <div className="flex gap-3">
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
                <Upload className="h-4 w-4" />
                {uploading ? "Importando..." : "Importar CSV/OFX"}
              </div>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv,.ofx"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
          </div>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Transações Não Conciliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma transação pendente de conciliação</p>
                  <p className="text-sm mt-1">Importe um extrato bancário para começar</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{transaction.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${transaction.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant="outline">Pendente</Badge>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">Sugestões de Conciliação:</p>
                      <div className="grid gap-2">
                        {accounts
                          .filter(acc => 
                            Math.abs(Number(acc.amount) - Math.abs(transaction.amount)) < 0.01 &&
                            ((transaction.amount > 0 && acc.type === 'receivable') ||
                             (transaction.amount < 0 && acc.type === 'payable'))
                          )
                          .slice(0, 3)
                          .map(account => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{account.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  Venc: {new Date(account.due_date).toLocaleDateString('pt-BR')} • {formatCurrency(Number(account.amount))}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => matchTransaction(transaction.id, account.id)}
                                className="bg-secondary text-secondary-foreground hover:opacity-90"
                              >
                                <ArrowRightLeft className="mr-1 h-3 w-3" />
                                Conciliar
                              </Button>
                            </div>
                          ))}
                      </div>
                      {accounts.filter(acc => 
                        Math.abs(Number(acc.amount) - Math.abs(transaction.amount)) < 0.01
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma correspondência encontrada
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ignoreTransaction(transaction.id)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Ignorar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Formato do CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              O arquivo CSV deve ter as seguintes colunas (com cabeçalho):
            </p>
            <code className="text-xs bg-muted p-2 rounded block">
              Data,Descrição,Valor,Saldo
              <br />
              2024-01-15,Pagamento Cliente X,1500.00,5000.00
              <br />
              2024-01-16,Compra Fornecedor Y,-500.00,4500.00
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              * Valores positivos para entradas, negativos para saídas
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
