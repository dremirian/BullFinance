import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Building2, TrendingUp, AlertTriangle, Users, Eye } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";

interface ClientSummary {
  client_id: string;
  client_name: string;
  total_receitas: number;
  total_despesas: number;
  saldo_total_bancos: number;
  contas_atrasadas: number;
}

export default function DashboardConsultor() {
  const navigate = useNavigate();
  const { setSelectedClient } = useClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    empresasAtivas: 0,
    empresasComAtrasos: 0,
    totalFluxos: 0,
    totalDashboards: 0,
  });
  const [clientes, setClientes] = useState<ClientSummary[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Refresh materialized view
      await supabase.rpc('refresh_client_summary');

      // Get all clients summary using the secure function
      const { data: summary, error } = await supabase.rpc('get_all_clients_summary');

      if (error) throw error;

      if (summary) {
        const empresasAtivas = summary.length;
        const empresasComAtrasos = summary.filter((c: any) => c.contas_atrasadas > 0).length;

        setStats({
          empresasAtivas,
          empresasComAtrasos,
          totalFluxos: empresasAtivas,
          totalDashboards: empresasAtivas,
        });

        setClientes(summary.map((s: any) => ({
          client_id: s.client_id,
          client_name: s.client_name,
          total_receitas: Number(s.total_receitas),
          total_despesas: Number(s.total_despesas),
          saldo_total_bancos: Number(s.saldo_total_bancos),
          contas_atrasadas: Number(s.contas_atrasadas),
        })));
      }
    } catch (error) {
      console.error("Error loading consultor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleViewClient = async (clientId: string, clientName: string) => {
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (client) {
      setSelectedClient(client);
      navigate('/dashboard');
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard do Consultor</h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de todos os clientes
          </p>
        </div>

        {/* KPIs Globais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Empresas Ativas
              </CardTitle>
              <Building2 className="h-4 w-4 text-emerald" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.empresasAtivas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes ativos
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Empresas com Atrasos
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.empresasComAtrasos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Requer atenção
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Fluxos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalFluxos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Analisados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dashboards Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalDashboards}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Em uso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Clientes */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle>Saúde Financeira dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientes.map((cliente) => {
                const resultado = cliente.total_receitas - cliente.total_despesas;
                const isNegativo = resultado < 0;
                const hasAtrasos = cliente.contas_atrasadas > 0;

                return (
                  <div 
                    key={cliente.client_id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{cliente.client_name}</h3>
                        {hasAtrasos && (
                          <span className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded-full">
                            {cliente.contas_atrasadas} atraso{cliente.contas_atrasadas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Receitas</p>
                          <p className="text-sm font-medium text-success">
                            {formatCurrency(cliente.total_receitas)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Despesas</p>
                          <p className="text-sm font-medium text-destructive">
                            {formatCurrency(cliente.total_despesas)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo em Bancos</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(cliente.saldo_total_bancos)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Resultado</p>
                        <p className={`text-sm font-semibold ${isNegativo ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(resultado)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewClient(cliente.client_id, cliente.client_name)}
                      className="ml-4"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Dashboard
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
