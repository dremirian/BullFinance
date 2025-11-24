import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Building2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardBancario() {
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    saldoTotal: 0,
    totalContas: 0,
    movimentacoes: 0,
    pendentes: 0,
  });
  const [saldosPorConta, setSaldosPorConta] = useState<any[]>([]);
  const [entradasSaidas, setEntradasSaidas] = useState<any[]>([]);
  const [evolucaoSaldo, setEvolucaoSaldo] = useState<any[]>([]);

  useEffect(() => {
    if (selectedClient) {
      loadData();
    }
  }, [selectedClient]);

  const loadData = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);

      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("client_id", selectedClient.id)
        .eq("active", true);

      const { data: transactions } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("client_id", selectedClient.id);

      if (bankAccounts) {
        const saldoTotal = bankAccounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
        
        setStats({
          saldoTotal,
          totalContas: bankAccounts.length,
          movimentacoes: transactions?.length || 0,
          pendentes: transactions?.filter(t => t.status === 'pending').length || 0,
        });

        // Saldos por conta
        setSaldosPorConta(bankAccounts.map(acc => ({
          name: acc.name,
          saldo: Number(acc.current_balance),
        })));

        // Entradas vs Saídas (últimos 30 dias)
        if (transactions) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const entradas = transactions
            .filter(t => t.amount > 0 && new Date(t.transaction_date) >= thirtyDaysAgo)
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const saidas = transactions
            .filter(t => t.amount < 0 && new Date(t.transaction_date) >= thirtyDaysAgo)
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

          setEntradasSaidas([
            { tipo: 'Entradas', valor: entradas },
            { tipo: 'Saídas', valor: saidas },
          ]);

          // Evolução do saldo (últimos 6 meses)
          const evolucao: any[] = [];
          for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);
            
            const monthTransactions = transactions.filter(t => {
              const tDate = new Date(t.transaction_date);
              return tDate >= monthStart && tDate <= monthEnd;
            });

            const saldoMes = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

            evolucao.push({
              mes: format(monthDate, "MMM", { locale: ptBR }),
              saldo: saldoMes,
            });
          }
          setEvolucaoSaldo(evolucao);
        }
      }
    } catch (error) {
      console.error("Error loading bancario data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Bancário</h1>
          <p className="text-muted-foreground mt-1">
            Controle de contas bancárias de {selectedClient.name}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <Wallet className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.saldoTotal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as contas
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Contas
              </CardTitle>
              <Building2 className="h-4 w-4 text-emerald" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalContas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contas ativas
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Movimentações Recentes
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.movimentacoes}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transações Pendentes
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.pendentes}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Não conciliadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Saldos por Banco */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Saldos por Conta Bancária</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={saldosPorConta}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="saldo" fill="hsl(var(--gold))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Entradas x Saídas */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle>Entradas x Saídas (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={entradasSaidas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--emerald))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Evolução do Saldo Bancário */}
          <Card className="border-border shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Evolução do Saldo Bancário</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolucaoSaldo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="saldo" stroke="hsl(var(--gold))" strokeWidth={3} name="Saldo" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
