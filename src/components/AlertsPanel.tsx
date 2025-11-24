import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/contexts/ClientContext";
import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  severity: string;
  visualizado: boolean;
  created_at: string;
}

export function AlertsPanel() {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedClient) {
      loadAlerts();
      generateAlerts();
      
      // Atualizar alertas a cada 5 minutos
      const interval = setInterval(() => {
        generateAlerts();
        loadAlerts();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [selectedClient]);

  const generateAlerts = async () => {
    if (!selectedClient) return;
    
    try {
      await supabase.rpc('generate_alerts');
    } catch (error) {
      console.error("Error generating alerts:", error);
    }
  };

  const loadAlerts = async () => {
    if (!selectedClient) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ visualizado: true })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, visualizado: true } : a
      ));
    } catch (error: any) {
      toast({
        title: "Erro ao marcar alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      
      toast({
        title: "Alerta removido",
        description: "O alerta foi removido com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-gold" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-card">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedClient) {
    return null;
  }

  const unreadCount = alerts.filter(a => !a.visualizado).length;

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Alertas e Notificações
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} novo{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
            <p>Nenhum alerta no momento</p>
            <p className="text-sm">Tudo está em ordem!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg transition-colors ${
                  alert.visualizado ? 'border-border bg-muted/20' : 'border-gold bg-gold/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{alert.titulo}</h4>
                        <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                          {alert.tipo}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!alert.visualizado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        title="Marcar como lido"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                      title="Remover alerta"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
