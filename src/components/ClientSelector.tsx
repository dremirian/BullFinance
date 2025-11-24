import { useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function ClientSelector() {
  const { selectedClient, setSelectedClient, clients, setClients, loading, setLoading } = useClient();
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      {/* Versão colapsada - apenas ícone */}
      <div className="group-data-[collapsible=icon]:flex hidden justify-center">
        <Building2 className="h-5 w-5 text-sidebar-foreground" />
      </div>

      {/* Versão expandida - completa */}
      <div className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-sidebar-foreground">Cliente Atual</span>
        </div>
        <Select
          value={selectedClient?.id || ""}
          onValueChange={(value) => {
            const client = clients.find((c) => c.id === value);
            setSelectedClient(client || null);
          }}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? "Carregando..." : "Selecione um cliente"} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedClient && clients.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Selecione um cliente para visualizar os dados
          </p>
        )}
      </div>
    </div>
  );
}
