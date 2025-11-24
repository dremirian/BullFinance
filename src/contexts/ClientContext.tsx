import React, { createContext, useContext, useState, useEffect } from 'react';

interface Client {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  logo_url?: string | null;
  cnpj?: string | null;
}

interface ClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clients: Client[];
  setClients: (clients: Client[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Persist selected client in localStorage and auto-select if only one client
  useEffect(() => {
    if (clients.length === 0) return;
    
    const savedClientId = localStorage.getItem('selectedClientId');
    if (savedClientId) {
      const client = clients.find(c => c.id === savedClientId);
      if (client) {
        setSelectedClient(client);
        return;
      }
    }
    
    // Auto-select if only one client exists and none is selected
    if (clients.length === 1 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients]);

  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem('selectedClientId', selectedClient.id);
    } else {
      localStorage.removeItem('selectedClientId');
    }
  }, [selectedClient]);

  return (
    <ClientContext.Provider value={{ 
      selectedClient, 
      setSelectedClient, 
      clients, 
      setClients,
      loading,
      setLoading
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
