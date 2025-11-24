-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT, -- CPF ou CNPJ
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de clientes (do cliente - confuso mas é customers do client)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT, -- CPF ou CNPJ
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  credit_limit NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar relacionamentos com suppliers e customers em accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Criar storage bucket para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('account-attachments', 'account-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage suppliers"
ON public.suppliers FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'financial_manager')
);

-- RLS para customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage customers"
ON public.customers FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'financial_manager')
);

-- RLS para storage bucket de anexos
CREATE POLICY "Users can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'account-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'account-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'account-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'account-attachments' AND auth.uid() IS NOT NULL);

-- Criar tabela para regras de conciliação
CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL, -- Regex ou texto para match
  account_type TEXT NOT NULL, -- 'payable' ou 'receivable'
  default_category TEXT,
  default_cost_center_id UUID REFERENCES public.cost_centers(id),
  auto_match BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para reconciliation_rules
ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reconciliation rules"
ON public.reconciliation_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage reconciliation rules"
ON public.reconciliation_rules FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'financial_manager')
);

-- Trigger para atualizar updated_at em suppliers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em customers
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em reconciliation_rules
CREATE TRIGGER update_reconciliation_rules_updated_at
BEFORE UPDATE ON public.reconciliation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_suppliers_client_id ON public.suppliers(client_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_customers_client_id ON public.customers(client_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_accounts_supplier_id ON public.accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON public.accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_client_id ON public.reconciliation_rules(client_id);