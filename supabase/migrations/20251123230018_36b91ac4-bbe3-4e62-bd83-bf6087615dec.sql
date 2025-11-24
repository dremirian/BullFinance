-- Corrigir aviso de segurança: Remover view materializada da API
-- Vamos usar uma função para acessar os dados ao invés de expor a view diretamente

-- Revogar acesso público à view materializada
REVOKE ALL ON public.client_financial_summary FROM anon, authenticated;

-- Criar função para acessar dados da view (mais seguro)
CREATE OR REPLACE FUNCTION public.get_all_clients_summary()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_accounts BIGINT,
  total_bank_accounts BIGINT,
  total_receitas NUMERIC,
  total_despesas NUMERIC,
  total_a_receber NUMERIC,
  total_a_pagar NUMERIC,
  saldo_total_bancos NUMERIC,
  contas_atrasadas BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.client_financial_summary;
END;
$$;