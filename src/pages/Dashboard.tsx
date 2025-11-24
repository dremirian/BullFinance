import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, AlertCircle, Receipt, FileText, Calendar, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertsPanel } from "@/components/AlertsPanel";

interface DashboardStats {
  totalReceived: number;
  totalPaid: number;
  totalReceivable: number;
  totalPayable: number;
  cashBalance: number;
  netProfit: number;
  avgTicket: number;
  defaultRate: number;
  monthGrowth: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [stats, setStats] = useState<DashboardStats>({
    totalReceived: 0,
    totalPaid: 0,
    totalReceivable: 0,
    totalPayable: 0,
    cashBalance: 0,
    netProfit: 0,
    avgTicket: 0,
    defaultRate: 0,
    monthGrowth: 0,
  });
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [accountsByDueDate, setAccountsByDueDate] = useState<any[]>([]);
  const [defaultData, setDefaultData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedClient) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [selectedClient, selectedPeriod]);

  // Realtime subscription for automatic updates
  useEffect(() => {
    if (!selectedClient) return;

    const channel = supabase
      .channel('accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        () => {
          // Reload dashboard data when accounts change
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient]);

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

  const loadDashboardData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      const { start, end } = getPeriodDates();

      // Fetch accounts data
      const { data: accounts } = await supabase
        .from("accounts")
        .select("*")
        .eq("client_id", selectedClient.id);

      // Fetch bank accounts data
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("client_id", selectedClient.id);

      if (accounts) {
        // Contas recebidas no período
        const received = accounts
          .filter(a => a.type === "receivable" && a.status === "paid" && 
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        // Contas pagas no período
        const paid = accounts
          .filter(a => a.type === "payable" && a.status === "paid" && 
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        // Contas a receber (pendentes)
        const receivable = accounts
          .filter(a => a.type === "receivable" && a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        // Contas a pagar (pendentes)
        const payable = accounts
          .filter(a => a.type === "payable" && a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        // Saldo em caixa
        const cashBalance = bankAccounts?.reduce(
          (sum, acc) => sum + Number(acc.current_balance),
          0
        ) || 0;

        // Ticket médio
        const receivedAccounts = accounts.filter(a => a.type === "receivable" && a.status === "paid");
        const avgTicket = receivedAccounts.length > 0 ? received / receivedAccounts.length : 0;

        // Taxa de inadimplência
        const overdueAccounts = accounts.filter(a => 
          a.type === "receivable" && 
          a.status === "pending" && 
          new Date(a.due_date) < new Date()
        );
        const defaultRate = receivable > 0 ? (overdueAccounts.reduce((sum, a) => sum + Number(a.amount), 0) / receivable) * 100 : 0;

        // Crescimento mensal
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
        const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
        const lastMonthReceived = accounts
          .filter(a => a.type === "receivable" && a.status === "paid" && 
            new Date(a.payment_date || a.due_date) >= lastMonthStart && 
            new Date(a.payment_date || a.due_date) <= lastMonthEnd)
          .reduce((sum, a) => sum + Number(a.amount), 0);
        const monthGrowth = lastMonthReceived > 0 ? ((received - lastMonthReceived) / lastMonthReceived) * 100 : 0;

        setStats({
          totalReceived: received,
          totalPaid: paid,
          totalReceivable: receivable,
          totalPayable: payable,
          cashBalance,
          netProfit: received - paid,
          avgTicket,
          defaultRate,
          monthGrowth,
        });

        // Fluxo de caixa diário
        const flowData: any[] = [];
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        for (let i = 0; i <= days; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const dateStr = format(date, "dd/MM");
          
          const dayReceived = accounts
            .filter(a => a.type === "receivable" && a.status === "paid" && 
              format(new Date(a.payment_date || a.due_date), "dd/MM/yyyy") === format(date, "dd/MM/yyyy"))
            .reduce((sum, a) => sum + Number(a.amount), 0);
            
          const dayPaid = accounts
            .filter(a => a.type === "payable" && a.status === "paid" && 
              format(new Date(a.payment_date || a.due_date), "dd/MM/yyyy") === format(date, "dd/MM/yyyy"))
            .reduce((sum, a) => sum + Number(a.amount), 0);

          flowData.push({
            date: dateStr,
            receitas: dayReceived,
            despesas: dayPaid,
            saldo: dayReceived - dayPaid,
          });
        }
        setCashFlowData(flowData);

        // Comparação mensal (últimos 6 meses)
        const monthlyData: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthReceived = accounts
            .filter(a => a.type === "receivable" && a.status === "paid" && 
              new Date(a.payment_date || a.due_date) >= monthStart && 
              new Date(a.payment_date || a.due_date) <= monthEnd)
            .reduce((sum, a) => sum + Number(a.amount), 0);
            
          const monthPaid = accounts
            .filter(a => a.type === "payable" && a.status === "paid" && 
              new Date(a.payment_date || a.due_date) >= monthStart && 
              new Date(a.payment_date || a.due_date) <= monthEnd)
            .reduce((sum, a) => sum + Number(a.amount), 0);

          monthlyData.push({
            mes: format(monthDate, "MMM", { locale: ptBR }),
            receitas: monthReceived,
            despesas: monthPaid,
            lucro: monthReceived - monthPaid,
          });
        }
        setMonthlyComparison(monthlyData);

        // Contas por vencimento
        const dueDateData = [
          {
            periodo: "Vencidas",
            receber: accounts.filter(a => a.type === "receivable" && a.status === "pending" && new Date(a.due_date) < new Date()).reduce((sum, a) => sum + Number(a.amount), 0),
            pagar: accounts.filter(a => a.type === "payable" && a.status === "pending" && new Date(a.due_date) < new Date()).reduce((sum, a) => sum + Number(a.amount), 0),
          },
          {
            periodo: "Hoje",
            receber: accounts.filter(a => a.type === "receivable" && a.status === "pending" && format(new Date(a.due_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).reduce((sum, a) => sum + Number(a.amount), 0),
            pagar: accounts.filter(a => a.type === "payable" && a.status === "pending" && format(new Date(a.due_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).reduce((sum, a) => sum + Number(a.amount), 0),
          },
          {
            periodo: "7 dias",
            receber: accounts.filter(a => a.type === "receivable" && a.status === "pending" && new Date(a.due_date) > new Date() && new Date(a.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).reduce((sum, a) => sum + Number(a.amount), 0),
            pagar: accounts.filter(a => a.type === "payable" && a.status === "pending" && new Date(a.due_date) > new Date() && new Date(a.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).reduce((sum, a) => sum + Number(a.amount), 0),
          },
          {
            periodo: "30 dias",
            receber: accounts.filter(a => a.type === "receivable" && a.status === "pending" && new Date(a.due_date) > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && new Date(a.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).reduce((sum, a) => sum + Number(a.amount), 0),
            pagar: accounts.filter(a => a.type === "payable" && a.status === "pending" && new Date(a.due_date) > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && new Date(a.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).reduce((sum, a) => sum + Number(a.amount), 0),
          },
        ];
        setAccountsByDueDate(dueDateData);

        // Dados de inadimplência
        const totalOverdue = overdueAccounts.reduce((sum, a) => sum + Number(a.amount), 0);
        const totalPending = receivable;
        setDefaultData([
          { name: "Em dia", value: totalPending - totalOverdue, color: "#16a34a" },
          { name: "Atrasado", value: totalOverdue, color: "#dc2626" },
        ]);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Selecione um cliente no menu lateral para visualizar o dashboard
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground mt-1">
            Visão completa das finanças de {selectedClient.name}
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
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recebido
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Líquido
            </CardTitle>
            <TrendingUp className={`h-4 w-4 ${stats.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(stats.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo em Caixa
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.cashBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível agora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Receber
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalReceivable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Pagar
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalPayable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.avgTicket)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por recebimento
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa Inadimplência
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.defaultRate > 20 ? 'text-destructive' : 'text-success'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.defaultRate > 20 ? 'text-destructive' : 'text-success'}`}>
              {stats.defaultRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas atrasadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fluxo de Caixa */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="hsl(var(--success))" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" strokeWidth={2} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="hsl(var(--gold))" strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparação Mensal */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Comparação Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(var(--success))" name="Receitas" />
                <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" />
                <Bar dataKey="lucro" fill="hsl(var(--gold))" name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contas por Vencimento */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Contas por Vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accountsByDueDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="periodo" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="receber" fill="hsl(var(--success))" name="A Receber" />
                <Bar dataKey="pagar" fill="hsl(var(--destructive))" name="A Pagar" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Status de Recebimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={defaultData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {defaultData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <AlertsPanel />

      {/* Quick Actions */}
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              onClick={() => navigate('/accounts')}
              className="h-20 bg-gradient-emerald text-white hover:opacity-90"
              size="lg"
            >
              <Receipt className="h-6 w-6 mr-2" />
              <span className="font-semibold">Nova Conta</span>
            </Button>
            <Button 
              onClick={() => navigate('/cash-flow')}
              className="h-20 bg-gradient-gold text-forest-green hover:opacity-90"
              size="lg"
            >
              <TrendingUp className="h-6 w-6 mr-2" />
              <span className="font-semibold">Ver Fluxo de Caixa</span>
            </Button>
            <Button 
              onClick={() => navigate('/reports')}
              className="h-20"
              variant="outline"
              size="lg"
            >
              <FileText className="h-6 w-6 mr-2" />
              <span className="font-semibold">Gerar Relatório</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
