-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT, -- CPF/CNPJ
  email TEXT,
  phone TEXT,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create clients"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers can manage clients"
ON public.clients
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'financial_manager'::app_role)
);

-- Add client_id to existing tables
ALTER TABLE public.accounts ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.cost_centers ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.bank_accounts ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.budgets ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.cash_flow ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.provisions ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.expenses ADD COLUMN client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.bank_transactions ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Create indexes for better performance
CREATE INDEX idx_accounts_client_id ON public.accounts(client_id);
CREATE INDEX idx_cost_centers_client_id ON public.cost_centers(client_id);
CREATE INDEX idx_bank_accounts_client_id ON public.bank_accounts(client_id);
CREATE INDEX idx_budgets_client_id ON public.budgets(client_id);
CREATE INDEX idx_cash_flow_client_id ON public.cash_flow(client_id);
CREATE INDEX idx_provisions_client_id ON public.provisions(client_id);
CREATE INDEX idx_expenses_client_id ON public.expenses(client_id);
CREATE INDEX idx_bank_transactions_client_id ON public.bank_transactions(client_id);

-- Create trigger for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();