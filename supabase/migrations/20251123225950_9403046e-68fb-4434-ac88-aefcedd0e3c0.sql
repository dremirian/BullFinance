-- FASE 1: MELHORIAS NA ESTRUTURA DE DADOS

-- 1. Adicionar campos em clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- 2. Criar storage bucket para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de storage para logos
CREATE POLICY "Logos são públicos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'client-logos');

CREATE POLICY "Usuários autenticados podem fazer upload de logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'client-logos' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários autenticados podem atualizar logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar logos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);

-- 4. Adicionar mais campos em accounts para melhor categorização
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
ADD COLUMN IF NOT EXISTS is_recorrente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_fixa BOOLEAN DEFAULT FALSE;

-- 5. Criar tabela de alertas
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('vencimento', 'saldo_baixo', 'inadimplencia', 'pico_despesa')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'success')),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  visualizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver alertas"
ON public.alerts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode criar alertas"
ON public.alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar alertas"
ON public.alerts FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_alerts_client_id ON public.alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_visualizado ON public.alerts(visualizado);

-- 6. Criar função para gerar alertas automáticos
CREATE OR REPLACE FUNCTION public.generate_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar alertas expirados
  DELETE FROM public.alerts WHERE expires_at < NOW();
  
  -- Alertas de vencimento (3 dias antes)
  INSERT INTO public.alerts (client_id, tipo, titulo, mensagem, severity, account_id, expires_at)
  SELECT 
    client_id,
    'vencimento',
    'Conta vencendo em breve',
    'A conta ' || description || ' no valor de R$ ' || amount || ' vence em ' || 
    EXTRACT(DAY FROM (due_date - CURRENT_DATE)) || ' dias',
    CASE 
      WHEN due_date <= CURRENT_DATE THEN 'error'
      WHEN due_date <= CURRENT_DATE + INTERVAL '1 day' THEN 'error'
      WHEN due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'warning'
      ELSE 'info'
    END,
    id,
    due_date + INTERVAL '7 days'
  FROM public.accounts
  WHERE status = 'pending'
    AND due_date <= CURRENT_DATE + INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.account_id = accounts.id 
      AND alerts.tipo = 'vencimento'
      AND alerts.created_at > CURRENT_DATE
    );
  
  -- Alertas de saldo baixo
  INSERT INTO public.alerts (client_id, tipo, titulo, mensagem, severity, bank_account_id, expires_at)
  SELECT 
    client_id,
    'saldo_baixo',
    'Saldo bancário baixo',
    'A conta ' || name || ' está com saldo de apenas R$ ' || current_balance,
    'warning',
    id,
    CURRENT_DATE + INTERVAL '1 day'
  FROM public.bank_accounts
  WHERE current_balance < 1000
    AND active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.bank_account_id = bank_accounts.id 
      AND alerts.tipo = 'saldo_baixo'
      AND alerts.created_at > CURRENT_DATE
    );
    
  -- Alertas de inadimplência
  INSERT INTO public.alerts (client_id, tipo, titulo, mensagem, severity, account_id, expires_at)
  SELECT 
    client_id,
    'inadimplencia',
    'Conta em atraso',
    'A conta ' || description || ' no valor de R$ ' || amount || ' está ' || 
    EXTRACT(DAY FROM (CURRENT_DATE - due_date)) || ' dias atrasada',
    'error',
    id,
    due_date + INTERVAL '30 days'
  FROM public.accounts
  WHERE status = 'pending'
    AND type = 'receivable'
    AND due_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE alerts.account_id = accounts.id 
      AND alerts.tipo = 'inadimplencia'
      AND alerts.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$;

-- 7. Criar função para calcular estatísticas por cliente
CREATE OR REPLACE FUNCTION public.get_client_stats(client_uuid UUID)
RETURNS TABLE (
  total_receitas NUMERIC,
  total_despesas NUMERIC,
  saldo_atual NUMERIC,
  contas_atrasadas INTEGER,
  taxa_inadimplencia NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN a.type = 'receivable' AND a.status = 'paid' THEN a.amount ELSE 0 END), 0) as total_receitas,
    COALESCE(SUM(CASE WHEN a.type = 'payable' AND a.status = 'paid' THEN a.amount ELSE 0 END), 0) as total_despesas,
    COALESCE((SELECT SUM(current_balance) FROM public.bank_accounts WHERE client_id = client_uuid), 0) as saldo_atual,
    CAST(COUNT(CASE WHEN a.status = 'pending' AND a.due_date < CURRENT_DATE THEN 1 END) AS INTEGER) as contas_atrasadas,
    CASE 
      WHEN SUM(CASE WHEN a.type = 'receivable' AND a.status = 'pending' THEN a.amount ELSE 0 END) > 0 
      THEN (
        SUM(CASE WHEN a.type = 'receivable' AND a.status = 'pending' AND a.due_date < CURRENT_DATE THEN a.amount ELSE 0 END) / 
        SUM(CASE WHEN a.type = 'receivable' AND a.status = 'pending' THEN a.amount ELSE 0 END)
      ) * 100
      ELSE 0
    END as taxa_inadimplencia
  FROM public.accounts a
  WHERE a.client_id = client_uuid;
END;
$$;

-- 8. Adicionar trigger para atualizar saldo bancário automaticamente
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando uma conta é paga, atualizar o saldo da conta bancária
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.bank_account_id IS NOT NULL THEN
    IF NEW.type = 'receivable' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.bank_account_id;
    ELSIF NEW.type = 'payable' THEN
      UPDATE public.bank_accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.bank_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_bank_balance
AFTER UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_bank_balance();

-- 9. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_accounts_client_status ON public.accounts(client_id, status);
CREATE INDEX IF NOT EXISTS idx_accounts_client_type ON public.accounts(client_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_due_date ON public.accounts(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payment_date ON public.accounts(payment_date);

-- 10. Criar view materializada para dashboards rápidos
CREATE MATERIALIZED VIEW IF NOT EXISTS public.client_financial_summary AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  COUNT(DISTINCT a.id) as total_accounts,
  COUNT(DISTINCT ba.id) as total_bank_accounts,
  COALESCE(SUM(CASE WHEN a.type = 'receivable' AND a.status = 'paid' THEN a.amount ELSE 0 END), 0) as total_receitas,
  COALESCE(SUM(CASE WHEN a.type = 'payable' AND a.status = 'paid' THEN a.amount ELSE 0 END), 0) as total_despesas,
  COALESCE(SUM(CASE WHEN a.type = 'receivable' AND a.status = 'pending' THEN a.amount ELSE 0 END), 0) as total_a_receber,
  COALESCE(SUM(CASE WHEN a.type = 'payable' AND a.status = 'pending' THEN a.amount ELSE 0 END), 0) as total_a_pagar,
  COALESCE(SUM(ba.current_balance), 0) as saldo_total_bancos,
  COUNT(CASE WHEN a.status = 'pending' AND a.due_date < CURRENT_DATE THEN 1 END) as contas_atrasadas,
  MAX(a.updated_at) as last_updated
FROM public.clients c
LEFT JOIN public.accounts a ON c.id = a.client_id
LEFT JOIN public.bank_accounts ba ON c.id = ba.client_id
WHERE c.active = true
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_financial_summary_client_id ON public.client_financial_summary(client_id);

-- 11. Função para refresh da view materializada
CREATE OR REPLACE FUNCTION public.refresh_client_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.client_financial_summary;
END;
$$;