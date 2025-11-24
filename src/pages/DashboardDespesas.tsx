import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingDown, DollarSign, Clock, Building2, Repeat, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardDespesas() {
  const { selectedClient } = useClient();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPago: 0,
    totalAPagar: 0,
    fixas: 0,
    variaveis: 0,
    custoOperacional: 0,
  });
  const [porCategoria, setPorCategoria] = useState<any[]>([]);
  const [porFornecedor, setPorFornecedor] = useState<any[]>([]);
  const [porCentroCusto, setPorCentroCusto] = useState<any[]>([]);
  const [comparativoMensal, setComparativoMensal] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient, selectedPeriod]);

  // Realtime subscription for automatic updates
  useEffect(() => {
    if (!selectedClient) return;

    const channel = supabase
      .channel('payable-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        () => {
          // Reload data when accounts change
          loadData();
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

  const loadData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      const { start, end } = getPeriodDates();

      const { data: accounts } = await supabase
        .from("accounts")
        .select("*")
        .eq("client_id", selectedClient.id)
        .eq("type", "payable");

      const { data: costCenters } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("client_id", selectedClient.id);

      if (accounts) {
        // Stats
        const pago = accounts
          .filter(a => a.status === "paid" && 
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const aPagar = accounts
          .filter(a => a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const fixas = accounts
          .filter(a => a.is_fixa && a.status === "paid")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const variaveis = accounts
          .filter(a => !a.is_fixa && a.status === "paid")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        setStats({
          totalPago: pago,
          totalAPagar: aPagar,
          fixas,
          variaveis,
          custoOperacional: pago,
        });

        // Por categoria
        const categorias = accounts.reduce((acc: any, a) => {
          const cat = a.description.split('-')[0].trim() || 'Outros';
          acc[cat] = (acc[cat] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorCategoria(Object.entries(categorias).map(([name, value]) => ({ name, value })));

        // Por fornecedor (Top 10)
        const fornecedores = accounts.reduce((acc: any, a) => {
          const forn = a.contact_name || 'Outros';
          acc[forn] = (acc[forn] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorFornecedor(Object.entries(fornecedores)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => (b.value as number) - (a.value as number))
          .slice(0, 10));

        // Por centro de custo
        const centros = accounts.reduce((acc: any, a) => {
          const centro = costCenters?.find(c => c.id === a.cost_center_id)?.name || 'Não categorizado';
          acc[centro] = (acc[centro] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorCentroCusto(Object.entries(centros).map(([name, value]) => ({ name, value })));

        // Comparativo mensal (últimos 6 meses)
        const mensal: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(new Date(), i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthValue = accounts
            .filter(a => a.status === "paid" && 
              new Date(a.payment_date || a.due_date) >= monthStart && 
              new Date(a.payment_date || a.due_date) <= monthEnd)
            .reduce((sum, a) => sum + Number(a.amount), 0);

          mensal.push({
            mes: format(monthDate, "MMM", { locale: ptBR }),
            valor: monthValue,
          });
        }
        setComparativoMensal(mensal);
      }
    } catch (error) {
      console.error("Error loading despesas data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];

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
            <h1 className="text-3xl font-bold text-foreground">Dashboard de Despesas</h1>
            <p className="text-muted-foreground mt-1">
              Análise completa das despesas de {selectedClient.name}
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

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pago
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.totalPago)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Pagar
              </CardTitle>
              <Clock className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalAPagar)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pendente
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas Fixas
              </CardTitle>
              <Repeat className="h-4 w-4 text-emerald" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.fixas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recorrentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas Variáveis
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.variaveis)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Eventuais
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custo Operacional
              </CardTitle>
              <Building2 className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.custoOperacional)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total do período
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Despesa por Categoria */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Despesa por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={porCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {porCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 10 Fornecedores */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Top 10 Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porFornecedor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Por Centro de Custo */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Despesa por Centro de Custo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porCentroCusto}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Comparativo Mensal */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Mês Atual vs Meses Anteriores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparativoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--destructive))" strokeWidth={3} name="Despesa" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
