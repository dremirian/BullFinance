import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileDown, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToPDF, exportToExcel, type FinancialData } from "@/lib/exportHelpers";
import { useToast } from "@/hooks/use-toast";

export default function DashboardDRE() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    cashBalance: 0,
    totalReceived: 0,
    totalPaid: 0,
  });
  const [margemData, setMargemData] = useState<any[]>([]);
  const [lucroMensal, setLucroMensal] = useState<any[]>([]);
  const [orcadoRealizado, setOrcadoRealizado] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient, selectedPeriod]);

  const getPeriodDates = () => {
    const now = new Date();
    if (selectedPeriod === "current") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (selectedPeriod === "last") {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    } else if (selectedPeriod === "last3") {
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  };

  const loadData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      const { start, end } = getPeriodDates();

      const [accountsRes, bankAccountsRes, budgetsRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("client_id", selectedClient.id),
        supabase.from("bank_accounts").select("current_balance").eq("client_id", selectedClient.id),
        supabase.from("budgets").select("*").eq("client_id", selectedClient.id),
      ]);

      if (accountsRes.data) {
        const received = accountsRes.data
          .filter((a) => a.type === "receivable" && a.status === "paid" &&
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const paid = accountsRes.data
          .filter((a) => a.type === "payable" && a.status === "paid" &&
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
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

        const netProfit = received - paid;

        setData({
          totalRevenue: received,
          totalExpenses: paid,
          netProfit,
          accountsReceivable: receivable,
          accountsPayable: payable,
          cashBalance,
          totalReceived: received,
          totalPaid: paid,
        });

        // Margem Data (cascata do DRE)
        const receitaBruta = received;
        const receitaLiquida = receitaBruta * 0.92; // Simplificado
        const custos = paid * 0.4; // Simplificado
        const despesas = paid * 0.6; // Simplificado
        const lucroLiquido = netProfit;
        const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

        setMargemData([
          { item: 'Receita Bruta', valor: receitaBruta },
          { item: 'Receita Líquida', valor: receitaLiquida },
          { item: 'Custos', valor: -custos },
          { item: 'Despesas', valor: -despesas },
          { item: 'Lucro Líquido', valor: lucroLiquido },
        ]);

        // Lucro mensal (últimos 6 meses)
        const mensal: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthReceived = accountsRes.data
            .filter(a => a.type === "receivable" && a.status === "paid" && 
              new Date(a.payment_date || a.due_date) >= monthStart && 
              new Date(a.payment_date || a.due_date) <= monthEnd)
            .reduce((sum, a) => sum + Number(a.amount), 0);
            
          const monthPaid = accountsRes.data
            .filter(a => a.type === "payable" && a.status === "paid" && 
              new Date(a.payment_date || a.due_date) >= monthStart && 
              new Date(a.payment_date || a.due_date) <= monthEnd)
            .reduce((sum, a) => sum + Number(a.amount), 0);

          mensal.push({
            mes: format(monthDate, "MMM", { locale: ptBR }),
            lucro: monthReceived - monthPaid,
          });
        }
        setLucroMensal(mensal);

        // Orçado vs Realizado
        if (budgetsRes.data) {
          const orcadoReal = budgetsRes.data.map(b => ({
            categoria: b.category,
            planejado: Number(b.planned_amount),
            realizado: Number(b.actual_amount),
          }));
          setOrcadoRealizado(orcadoReal);
        }
      }
    } catch (error) {
      console.error("Error loading DRE data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedClient) return;

    try {
      if (format === 'pdf') {
        await exportToPDF(data, selectedClient.name, selectedClient.logo_url || undefined);
        toast({
          title: "DRE exportado em PDF!",
          description: "O relatório profissional foi baixado",
        });
      } else {
        exportToExcel(data, selectedClient.name, selectedClient.logo_url || undefined);
        toast({
          title: "DRE exportado em Excel!",
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">DRE - Demonstração do Resultado</h1>
            <p className="text-muted-foreground mt-1">
              Análise de resultado de {selectedClient.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês Atual</SelectItem>
                <SelectItem value="last">Mês Passado</SelectItem>
                <SelectItem value="last3">Últimos 3 Meses</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleExport('pdf')} className="bg-gold text-forest-green hover:bg-gold/90">
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button onClick={() => handleExport('excel')} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Bruta
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-success">
                {formatCurrency(data.totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Líquida
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-success">
                {formatCurrency(data.totalRevenue * 0.92)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custos
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(data.totalExpenses * 0.4)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(data.totalExpenses * 0.6)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lucro Líquido
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(data.netProfit)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margem de Lucro
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : '0'}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* DRE em Cascata */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>DRE em Cascata</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={margemData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="item" stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={80} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--gold))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lucro Mensal */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Evolução do Lucro Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={lucroMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="lucro" stroke="hsl(var(--gold))" strokeWidth={3} name="Lucro" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orçado vs Realizado */}
          <Card className="border-border shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Orçado vs Realizado por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={orcadoRealizado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="categoria" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="planejado" fill="hsl(var(--muted))" name="Planejado" />
                  <Bar dataKey="realizado" fill="hsl(var(--gold))" name="Realizado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
