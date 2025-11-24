import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { exportToPDF, exportToExcel, type FinancialData } from "@/lib/exportHelpers";

export default function Reports() {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    cashBalance: 0,
  });

  useEffect(() => {
    if (selectedClient) {
      void loadReportData();
    }
  }, [selectedClient]);

  const loadReportData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);

      const [accountsRes, bankAccountsRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("client_id", selectedClient.id),
        supabase.from("bank_accounts").select("current_balance").eq("client_id", selectedClient.id),
      ]);

      if (accountsRes.data) {
        const revenue = accountsRes.data
          .filter((a) => a.type === "receivable" && a.status === "paid")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const expenses = accountsRes.data
          .filter((a) => a.type === "payable" && a.status === "paid")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const receivable = accountsRes.data
          .filter((a) => a.type === "receivable" && a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const payable = accountsRes.data
          .filter((a) => a.type === "payable" && a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const cashBalance = bankAccountsRes.data?.reduce(
          (sum, acc) => sum + Number(acc.current_balance),
          0
        ) || 0;

        setData({
          totalRevenue: revenue,
          totalExpenses: expenses,
          netProfit: revenue - expenses,
          accountsReceivable: receivable,
          accountsPayable: payable,
          cashBalance,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para exportar o relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = {
        ...data,
        totalReceived: data.totalRevenue,
        totalPaid: data.totalExpenses,
      };
      
      if (format === 'pdf') {
        await exportToPDF(exportData, selectedClient.name, selectedClient.logo_url || undefined);
        toast({
          title: "Relatório PDF exportado!",
          description: "O relatório profissional Bull Finance foi baixado",
        });
      } else {
        exportToExcel(exportData, selectedClient.name, selectedClient.logo_url || undefined);
        toast({
          title: "Relatório Excel exportado!",
          description: "A planilha completa foi baixada",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
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
              Selecione um cliente no menu lateral para visualizar os relatórios
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
            <h1 className="text-3xl font-bold text-foreground">Relatórios Financeiros</h1>
            <p className="text-muted-foreground">
              Visualize DRE, balancete simplificado e indicadores-chave.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('pdf')} className="bg-gold text-forest-green hover:bg-gold/90">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={() => handleExport('excel')} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas Totais
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(data.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Contas recebidas</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas Totais
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(data.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1">Contas pagas</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lucro Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(data.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>DRE - Demonstração do Resultado do Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Receita Bruta</TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(data.totalRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">(-) Despesas Operacionais</TableCell>
                  <TableCell className="text-right text-destructive">
                    ({formatCurrency(data.totalExpenses)})
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">Resultado Líquido</TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      data.netProfit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(data.netProfit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Balancete Simplificado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Caixa e Bancos</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.cashBalance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Contas a Receber</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.accountsReceivable)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Contas a Pagar</TableCell>
                  <TableCell className="text-right text-destructive">
                    ({formatCurrency(data.accountsPayable)})
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-bold">Patrimônio Líquido</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(data.cashBalance + data.accountsReceivable - data.accountsPayable)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Indicadores-Chave (KPIs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Margem Líquida</p>
                <p className="text-2xl font-bold">
                  {data.totalRevenue > 0
                    ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Liquidez Imediata</p>
                <p className="text-2xl font-bold">
                  {data.accountsPayable > 0
                    ? (data.cashBalance / data.accountsPayable).toFixed(2)
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}