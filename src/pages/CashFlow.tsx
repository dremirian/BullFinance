import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "receivable" | "payable";
  is_projection: boolean;
}

export default function CashFlow() {
  const { toast } = useToast();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowEntry[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  useEffect(() => {
    if (selectedClient) {
      void loadCashFlow();
    }
  }, [period, selectedClient]);

  const loadCashFlow = async () => {
    if (!selectedClient) return;
    
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const { data: accounts, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("client_id", selectedClient.id)
        .gte("due_date", startDate.toISOString().split("T")[0])
        .lte("due_date", endDate.toISOString().split("T")[0])
        .order("due_date");

      if (error) throw error;

      const entries: CashFlowEntry[] = (accounts || []).map((acc) => ({
        id: acc.id,
        date: acc.due_date,
        description: acc.description,
        category: acc.type === "receivable" ? "Recebimento" : "Pagamento",
        amount: Number(acc.amount),
        type: acc.type as "receivable" | "payable",
        is_projection: acc.status === "pending",
      }));

      setCashFlowData(entries);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fluxo de caixa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const calculateTotals = () => {
    const inflow = cashFlowData
      .filter((e) => e.type === "receivable")
      .reduce((sum, e) => sum + e.amount, 0);
    const outflow = cashFlowData
      .filter((e) => e.type === "payable")
      .reduce((sum, e) => sum + e.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  };

  const totals = calculateTotals();

  const groupByMonth = () => {
    const grouped: Record<string, CashFlowEntry[]> = {};
    cashFlowData.forEach((entry) => {
      const month = new Date(entry.date).toLocaleDateString("pt-BR", { year: "numeric", month: "long" });
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(entry);
    });
    return grouped;
  };

  const monthlyData = groupByMonth();

  if (!selectedClient) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Selecione um cliente no menu lateral para visualizar o fluxo de caixa
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
          <h1 className="text-3xl font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">
            Monitore entradas e saídas, visualize projeções e simule cenários futuros.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Entradas
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.inflow)}</div>
              <p className="text-xs text-muted-foreground mt-1">Próximos 3 meses</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Saídas
              </CardTitle>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.outflow)}</div>
              <p className="text-xs text-muted-foreground mt-1">Próximos 3 meses</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultado Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.net >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(totals.net)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entradas - Saídas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="monthly" className="space-y-6">
          <TabsList>
            <TabsTrigger value="monthly" onClick={() => setPeriod("monthly")}>
              Mensal
            </TabsTrigger>
            <TabsTrigger value="weekly" onClick={() => setPeriod("weekly")}>
              Semanal
            </TabsTrigger>
            <TabsTrigger value="daily" onClick={() => setPeriod("daily")}>
              Diário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : Object.keys(monthlyData).length === 0 ? (
              <Card className="border-border shadow-card">
                <CardContent className="py-10">
                  <p className="text-center text-muted-foreground">
                    Nenhuma movimentação encontrada para os próximos meses.
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(monthlyData).map(([month, entries]) => (
                <Card key={month} className="border-border shadow-card mb-4">
                  <CardHeader>
                    <CardTitle className="capitalize">{month}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                {new Date(entry.date).toLocaleDateString("pt-BR")}
                                {entry.is_projection && (
                                  <span className="ml-2 text-xs text-muted-foreground">(Projeção)</span>
                                )}
                              </TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell>{entry.category}</TableCell>
                              <TableCell
                                className={`text-right font-medium ${
                                  entry.type === "receivable" ? "text-success" : "text-destructive"
                                }`}
                              >
                                {entry.type === "receivable" ? "+" : "-"} {formatCurrency(entry.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="weekly">
            <Card className="border-border shadow-card">
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">
                  Visualização semanal em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="border-border shadow-card">
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">
                  Visualização diária em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}