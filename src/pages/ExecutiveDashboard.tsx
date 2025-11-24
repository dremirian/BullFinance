import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { useToast } from "@/components/ui/use-toast";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import bullFinanceLogo from "@/assets/bull-finance-logo.png";

const COLORS = ['#042b1c', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ExecutiveDashboard() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [comparison, setComparison] = useState('previous');
  
  const [data, setData] = useState({
    kpis: {
      revenue: 0,
      expense: 0,
      profit: 0,
      profitMargin: 0,
      growth: 0
    },
    cashFlow: [],
    revenueByCategory: [],
    expenseByCategory: [],
    monthlyTrend: [],
    comparison: { current: 0, previous: 0, change: 0 }
  });

  useEffect(() => {
    if (!selectedClient) return;

    // Carrega dados iniciais
    loadData();

    // Inscreve em mudanças nas contas para atualizar o dashboard executivo em tempo real
    const channel = supabase
      .channel(`executive-dashboard-accounts-${selectedClient.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient, period, comparison]);

  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case 'day':
        return { start: now, end: now };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const loadData = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();

      // Buscar todas as contas do cliente (sem filtro de data para cálculos históricos)
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('client_id', selectedClient.id);

      // Receita e despesa no período selecionado
      const revenue = accounts
        ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
          new Date(a.payment_date || a.due_date) >= start &&
          new Date(a.payment_date || a.due_date) <= end)
        .reduce((sum, a) => sum + a.amount, 0) || 0;

      const expense = accounts
        ?.filter(a => a.type === 'payable' && a.status === 'paid' &&
          new Date(a.payment_date || a.due_date) >= start &&
          new Date(a.payment_date || a.due_date) <= end)
        .reduce((sum, a) => sum + a.amount, 0) || 0;

      const profit = revenue - expense;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Receita por categoria no período
      const revenueByCategory = accounts
        ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
          new Date(a.payment_date || a.due_date) >= start &&
          new Date(a.payment_date || a.due_date) <= end)
        .reduce((acc, a) => {
          const category = a.description || 'Outros';
          const existing = acc.find(c => c.name === category);
          if (existing) {
            existing.value += a.amount;
          } else {
            acc.push({ name: category, value: a.amount });
          }
          return acc;
        }, [] as Array<{ name: string; value: number }>);

      // Despesa por categoria no período
      const expenseByCategory = accounts
        ?.filter(a => a.type === 'payable' && a.status === 'paid' &&
          new Date(a.payment_date || a.due_date) >= start &&
          new Date(a.payment_date || a.due_date) <= end)
        .reduce((acc, a) => {
          const category = a.description || 'Outros';
          const existing = acc.find(c => c.name === category);
          if (existing) {
            existing.value += a.amount;
          } else {
            acc.push({ name: category, value: a.amount });
          }
          return acc;
        }, [] as Array<{ name: string; value: number }>);

      // Tendência mensal (últimos 6 meses) - já filtrado localmente
      const monthlyTrend = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(now, i);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthRevenue = accounts
          ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
            new Date(a.payment_date || a.due_date) >= monthStart &&
            new Date(a.payment_date || a.due_date) <= monthEnd)
          .reduce((sum, a) => sum + a.amount, 0) || 0;

        const monthExpense = accounts
          ?.filter(a => a.type === 'payable' && a.status === 'paid' &&
            new Date(a.payment_date || a.due_date) >= monthStart &&
            new Date(a.payment_date || a.due_date) <= monthEnd)
          .reduce((sum, a) => sum + a.amount, 0) || 0;

        monthlyTrend.push({
          month: month.toLocaleDateString('pt-BR', { month: 'short' }),
          receita: monthRevenue,
          despesa: monthExpense,
          lucro: monthRevenue - monthExpense
        });
      }

      // Cálculo de crescimento baseado no período anterior
      let previousRevenue = 0;
      if (period === 'month') {
        const prevMonth = subMonths(now, 1);
        const prevStart = startOfMonth(prevMonth);
        const prevEnd = endOfMonth(prevMonth);
        previousRevenue = accounts
          ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
            new Date(a.payment_date || a.due_date) >= prevStart &&
            new Date(a.payment_date || a.due_date) <= prevEnd)
          .reduce((sum, a) => sum + a.amount, 0) || 0;
      } else if (period === 'quarter') {
        const prevQuarter = subQuarters(now, 1);
        const prevStart = startOfQuarter(prevQuarter);
        const prevEnd = endOfQuarter(prevQuarter);
        previousRevenue = accounts
          ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
            new Date(a.payment_date || a.due_date) >= prevStart &&
            new Date(a.payment_date || a.due_date) <= prevEnd)
          .reduce((sum, a) => sum + a.amount, 0) || 0;
      } else if (period === 'year') {
        const prevYear = new Date(now.getFullYear() - 1, 0, 1);
        const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        previousRevenue = accounts
          ?.filter(a => a.type === 'receivable' && a.status === 'paid' &&
            new Date(a.payment_date || a.due_date) >= prevYear &&
            new Date(a.payment_date || a.due_date) <= prevYearEnd)
          .reduce((sum, a) => sum + a.amount, 0) || 0;
      }

      const growth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
      const changePercent = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;

      setData({
        kpis: {
          revenue,
          expense,
          profit,
          profitMargin,
          growth
        },
        cashFlow: [],
        revenueByCategory: revenueByCategory || [],
        expenseByCategory: expenseByCategory || [],
        monthlyTrend,
        comparison: { current: revenue, previous: previousRevenue, change: changePercent }
      });
    } catch (error) {
      console.error('Error loading executive dashboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados do dashboard executivo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPeriodLabel = () => {
    const labels: Record<string, string> = {
      day: 'Hoje',
      week: 'Esta Semana',
      month: 'Este Mês',
      quarter: 'Trimestre',
      year: 'Ano'
    };
    return labels[period] || 'Este Mês';
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Converte logo para base64
      const logoImg = await fetch(bullFinanceLogo);
      const logoBlob = await logoImg.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });

      // Logo centralizado
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 15, 10, 30, 30);

      // Cabeçalho
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard Executivo', pageWidth / 2, 50, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${selectedClient?.name || 'N/A'}`, 14, 60);
      doc.text(`Período: ${getPeriodLabel()}`, 14, 65);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 70);

      // KPIs
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Principais', 14, 80);

      const kpisData = [
        ['Indicador', 'Valor'],
        ['Receita Total', formatCurrency(data.kpis.revenue)],
        ['Despesa Total', formatCurrency(data.kpis.expense)],
        ['Lucro Líquido', formatCurrency(data.kpis.profit)],
        ['Margem de Lucro', `${data.kpis.profitMargin.toFixed(1)}%`],
        ['Crescimento', `${data.kpis.growth >= 0 ? '+' : ''}${data.kpis.growth.toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: 85,
        head: [kpisData[0]],
        body: kpisData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [4, 43, 28] },
      });

      // Receitas por Categoria
      if (data.revenueByCategory.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 85;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Receitas por Categoria', 14, finalY + 10);

        const revenueData = [
          ['Categoria', 'Valor'],
          ...data.revenueByCategory.map(item => [item.name, formatCurrency(item.value)])
        ];

        autoTable(doc, {
          startY: finalY + 15,
          head: [revenueData[0]],
          body: revenueData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [4, 43, 28] },
        });
      }

      // Despesas por Categoria
      if (data.expenseByCategory.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Despesas por Categoria', 14, finalY + 10);

        const expenseData = [
          ['Categoria', 'Valor'],
          ...data.expenseByCategory.map(item => [item.name, formatCurrency(item.value)])
        ];

        autoTable(doc, {
          startY: finalY + 15,
          head: [expenseData[0]],
          body: expenseData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [4, 43, 28] },
        });
      }

      // Rodapé
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        'Sistema idealizado por Vanessa Dias (LinkedIn: https://www.linkedin.com/in/vanessaazuos/) e',
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
      );
      doc.text(
        'desenvolvido por Andressa Mirian (LinkedIn: https://www.linkedin.com/in/andressamirian/) no ano de 2025.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Todos os direitos reservados.',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );

      // Salvar PDF
      doc.save(`dashboard-executivo-${selectedClient?.name || 'relatorio'}-${new Date().toLocaleDateString('pt-BR')}.pdf`);
      
      toast({
        title: "PDF exportado com sucesso",
        description: "O relatório foi gerado e baixado."
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o PDF",
        variant: "destructive"
      });
    }
  };

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Selecione um cliente para visualizar o dashboard executivo</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
            <p className="text-muted-foreground">Visão completa e interativa do desempenho financeiro</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(data.kpis.revenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                +{data.kpis.growth.toFixed(1)}% vs período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(data.kpis.expense)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingDown className="h-3 w-3 mr-1 text-success" />
                -3.2% vs período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.kpis.profit)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Margem: {data.kpis.profitMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+{data.kpis.growth.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Meta: +15%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Tendências</TabsTrigger>
            <TabsTrigger value="breakdown">Composição</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" />
                    <Line type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} name="Despesa" />
                    <Line type="monotone" dataKey="lucro" stroke="#042b1c" strokeWidth={2} name="Lucro" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.revenueByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.revenueByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Despesa por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.expenseByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparação Período a Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={[
                      { name: 'Período Anterior', valor: data.comparison.previous },
                      { name: 'Período Atual', valor: data.comparison.current }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="valor" fill="#042b1c" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Variação: <span className="text-success font-bold">+{data.comparison.change.toFixed(1)}%</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}