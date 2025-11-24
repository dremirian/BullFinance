import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Clock, Users, Repeat, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardReceitas() {
  const { selectedClient } = useClient();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecebido: 0,
    totalAReceber: 0,
    totalAtrasado: 0,
    ticketMedio: 0,
    receitaRecorrente: 0,
  });
  const [porCategoria, setPorCategoria] = useState<any[]>([]);
  const [porCliente, setPorCliente] = useState<any[]>([]);
  const [porFormaPagamento, setPorFormaPagamento] = useState<any[]>([]);
  const [historicoMensal, setHistoricoMensal] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient, selectedPeriod]);

  // Realtime subscription for automatic updates
  useEffect(() => {
    if (!selectedClient) return;

    const channel = supabase
      .channel('receivable-accounts-changes')
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
        .eq("type", "receivable");

      if (accounts) {
        // Stats
        const recebido = accounts
          .filter(a => a.status === "paid" && 
            new Date(a.payment_date || a.due_date) >= start && 
            new Date(a.payment_date || a.due_date) <= end)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const aReceber = accounts
          .filter(a => a.status === "pending")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const atrasado = accounts
          .filter(a => a.status === "pending" && new Date(a.due_date) < new Date())
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const recebidas = accounts.filter(a => a.status === "paid");
        const ticketMedio = recebidas.length > 0 ? recebido / recebidas.length : 0;

        const recorrente = accounts
          .filter(a => a.is_recorrente && a.status === "paid")
          .reduce((sum, a) => sum + Number(a.amount), 0);

        setStats({
          totalRecebido: recebido,
          totalAReceber: aReceber,
          totalAtrasado: atrasado,
          ticketMedio,
          receitaRecorrente: recorrente,
        });

        // Por categoria
        const categorias = accounts.reduce((acc: any, a) => {
          const cat = a.description.split('-')[0].trim() || 'Outros';
          acc[cat] = (acc[cat] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorCategoria(Object.entries(categorias).map(([name, value]) => ({ name, value })));

        // Por cliente
        const clientes = accounts.reduce((acc: any, a) => {
          const cli = a.contact_name || 'Outros';
          acc[cli] = (acc[cli] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorCliente(Object.entries(clientes)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => (b.value as number) - (a.value as number))
          .slice(0, 10));

        // Por forma de pagamento
        const formas = accounts.reduce((acc: any, a) => {
          const forma = a.payment_method || a.forma_pagamento || 'Não informado';
          acc[forma] = (acc[forma] || 0) + Number(a.amount);
          return acc;
        }, {});
        setPorFormaPagamento(Object.entries(formas).map(([name, value]) => ({ name, value })));

        // Histórico mensal (últimos 6 meses)
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
        setHistoricoMensal(mensal);
      }
    } catch (error) {
      console.error("Error loading receitas data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

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
            <h1 className="text-3xl font-bold text-foreground">Dashboard de Receitas</h1>
            <p className="text-muted-foreground mt-1">
              Análise completa das receitas de {selectedClient.name}
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
                Total Recebido
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats.totalRecebido)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Receber
              </CardTitle>
              <Clock className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalAReceber)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pendente
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atrasado
              </CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.totalAtrasado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vencidas
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
                {formatCurrency(stats.ticketMedio)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por recebimento
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Recorrente
              </CardTitle>
              <Repeat className="h-4 w-4 text-emerald" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald">
                {formatCurrency(stats.receitaRecorrente)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mensalidades/Assinaturas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Receita por Categoria */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Receita por Categoria</CardTitle>
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

          {/* Receita por Cliente (Top 10) */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porCliente} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Forma de Pagamento */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Receita por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={porFormaPagamento}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Histórico Mensal */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Histórico Mensal (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--success))" strokeWidth={3} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
