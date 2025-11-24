-- Criar tabela de categorias hierárquicas
CREATE TABLE IF NOT EXISTS public.account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.account_categories(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('payable', 'receivable')),
  expense_type TEXT CHECK (expense_type IN ('cost', 'expense')),
  keywords TEXT[], -- palavras-chave para sugestão automática
  suppliers TEXT[], -- fornecedores típicos desta categoria
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_account_categories_client ON public.account_categories(client_id);
CREATE INDEX idx_account_categories_parent ON public.account_categories(parent_id);
CREATE INDEX idx_account_categories_type ON public.account_categories(account_type);

-- Adicionar campo expense_type e category_id na tabela accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS expense_type TEXT CHECK (expense_type IN ('cost', 'expense'));
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.account_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_category ON public.accounts(category_id);

-- RLS para categorias
ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories"
ON public.account_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage categories"
ON public.account_categories FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'financial_manager'::app_role)
);

-- Função para sugerir categorias padrão ao criar um cliente
CREATE OR REPLACE FUNCTION public.create_default_categories(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_marketing_id UUID;
  v_admin_id UUID;
  v_financial_id UUID;
  v_tax_id UUID;
  v_people_id UUID;
  v_tech_id UUID;
  v_legal_id UUID;
BEGIN
  -- CUSTOS
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type, keywords, suppliers)
  VALUES 
    (p_client_id, 'Matéria-prima', 'payable', 'cost', ARRAY['materia', 'material', 'insumo'], ARRAY[]::TEXT[]),
    (p_client_id, 'Mão de obra operacional', 'payable', 'cost', ARRAY['operacional', 'producao', 'fabrica'], ARRAY[]::TEXT[]),
    (p_client_id, 'Software operacional', 'payable', 'cost', ARRAY['software', 'sistema', 'operacao'], ARRAY[]::TEXT[]),
    (p_client_id, 'Deslocamento operacional', 'payable', 'cost', ARRAY['combustivel', 'frete', 'entrega'], ARRAY[]::TEXT[]),
    (p_client_id, 'Terceirizados operação', 'payable', 'cost', ARRAY['terceirizado', 'freelancer'], ARRAY[]::TEXT[]),
    (p_client_id, 'Equipamentos operação', 'payable', 'cost', ARRAY['equipamento', 'maquina', 'ferramenta'], ARRAY[]::TEXT[]);

  -- DESPESAS - Marketing
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Marketing', 'payable', 'expense')
  RETURNING id INTO v_marketing_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords, suppliers)
  VALUES 
    (p_client_id, 'Tráfego pago', v_marketing_id, 'payable', 'expense', 
     ARRAY['ads', 'anuncio', 'facebook', 'google', 'meta', 'instagram'], 
     ARRAY['Facebook', 'Meta', 'Google', 'Google Ads', 'Instagram']),
    (p_client_id, 'Identidade visual', v_marketing_id, 'payable', 'expense', 
     ARRAY['logo', 'design', 'visual', 'arte'], ARRAY[]::TEXT[]),
    (p_client_id, 'Plataforma social media', v_marketing_id, 'payable', 'expense', 
     ARRAY['social', 'agendamento', 'mlabs'], ARRAY['mLabs', 'Hootsuite']),
    (p_client_id, 'Produção de conteúdo', v_marketing_id, 'payable', 'expense', 
     ARRAY['conteudo', 'post', 'video', 'foto'], ARRAY[]::TEXT[]),
    (p_client_id, 'Impulsionamentos', v_marketing_id, 'payable', 'expense', 
     ARRAY['boost', 'impulsionamento'], ARRAY[]::TEXT[]);

  -- DESPESAS - Administrativas
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Administrativas', 'payable', 'expense')
  RETURNING id INTO v_admin_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords, suppliers)
  VALUES 
    (p_client_id, 'Aluguel', v_admin_id, 'payable', 'expense', 
     ARRAY['aluguel', 'locacao'], ARRAY[]::TEXT[]),
    (p_client_id, 'Água, luz, internet', v_admin_id, 'payable', 'expense', 
     ARRAY['agua', 'luz', 'energia', 'internet', 'copel', 'sanepar'], 
     ARRAY['Copel', 'Sanepar', 'Vivo', 'Claro', 'Tim', 'Oi']),
    (p_client_id, 'Telefonia', v_admin_id, 'payable', 'expense', 
     ARRAY['telefone', 'celular', 'vivo', 'tim', 'claro'], 
     ARRAY['Vivo', 'Claro', 'Tim', 'Oi']),
    (p_client_id, 'Material de escritório', v_admin_id, 'payable', 'expense', 
     ARRAY['papelaria', 'escritorio', 'caneta'], ARRAY[]::TEXT[]),
    (p_client_id, 'Serviços gerais', v_admin_id, 'payable', 'expense', 
     ARRAY['limpeza', 'manutencao', 'seguranca'], ARRAY[]::TEXT[]);

  -- DESPESAS - Financeiras
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Financeiras', 'payable', 'expense')
  RETURNING id INTO v_financial_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords)
  VALUES 
    (p_client_id, 'Tarifas bancárias', v_financial_id, 'payable', 'expense', 
     ARRAY['tarifa', 'banco', 'ted', 'pix']),
    (p_client_id, 'Juros', v_financial_id, 'payable', 'expense', 
     ARRAY['juros', 'mora']),
    (p_client_id, 'Multas', v_financial_id, 'payable', 'expense', 
     ARRAY['multa', 'penalidade']),
    (p_client_id, 'Taxas de cartão', v_financial_id, 'payable', 'expense', 
     ARRAY['cartao', 'maquininha', 'stone', 'cielo', 'rede']);

  -- DESPESAS - Impostos
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Impostos', 'payable', 'expense')
  RETURNING id INTO v_tax_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords)
  VALUES 
    (p_client_id, 'DAS (MEI)', v_tax_id, 'payable', 'expense', 
     ARRAY['das', 'mei', 'simples']),
    (p_client_id, 'INSS', v_tax_id, 'payable', 'expense', 
     ARRAY['inss', 'previdencia']),
    (p_client_id, 'ISS', v_tax_id, 'payable', 'expense', 
     ARRAY['iss', 'servico']),
    (p_client_id, 'IRPJ / CSLL', v_tax_id, 'payable', 'expense', 
     ARRAY['irpj', 'csll', 'imposto', 'renda']),
    (p_client_id, 'Outros tributos', v_tax_id, 'payable', 'expense', 
     ARRAY['tributo', 'imposto']);

  -- DESPESAS - Pessoas
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Despesas com Pessoas', 'payable', 'expense')
  RETURNING id INTO v_people_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords)
  VALUES 
    (p_client_id, 'Salários', v_people_id, 'payable', 'expense', 
     ARRAY['salario', 'folha', 'pagamento']),
    (p_client_id, 'Benefícios', v_people_id, 'payable', 'expense', 
     ARRAY['beneficio', 'plano', 'saude']),
    (p_client_id, 'Vale alimentação', v_people_id, 'payable', 'expense', 
     ARRAY['vale', 'alimentacao', 'refeicao']),
    (p_client_id, 'Vale transporte', v_people_id, 'payable', 'expense', 
     ARRAY['vale', 'transporte']),
    (p_client_id, 'Treinamentos', v_people_id, 'payable', 'expense', 
     ARRAY['treinamento', 'curso', 'capacitacao']);

  -- DESPESAS - Tecnologia
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Tecnologia', 'payable', 'expense')
  RETURNING id INTO v_tech_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords, suppliers)
  VALUES 
    (p_client_id, 'Assinaturas SaaS', v_tech_id, 'payable', 'expense', 
     ARRAY['saas', 'software', 'assinatura', 'notion', 'hubspot'], 
     ARRAY['Notion', 'HubSpot', 'Salesforce', 'Slack']),
    (p_client_id, 'Hospedagem', v_tech_id, 'payable', 'expense', 
     ARRAY['hospedagem', 'host', 'servidor'], 
     ARRAY['Hostinger', 'HostGator', 'GoDaddy']),
    (p_client_id, 'Domínio', v_tech_id, 'payable', 'expense', 
     ARRAY['dominio', 'site']),
    (p_client_id, 'Serviços de nuvem', v_tech_id, 'payable', 'expense', 
     ARRAY['aws', 'azure', 'google', 'cloud'], 
     ARRAY['AWS', 'Amazon', 'Azure', 'Google Cloud', 'GCP']);

  -- DESPESAS - Jurídico & Contabilidade
  INSERT INTO public.account_categories (client_id, name, account_type, expense_type)
  VALUES (p_client_id, 'Jurídico & Contabilidade', 'payable', 'expense')
  RETURNING id INTO v_legal_id;

  INSERT INTO public.account_categories (client_id, name, parent_id, account_type, expense_type, keywords)
  VALUES 
    (p_client_id, 'Contador', v_legal_id, 'payable', 'expense', 
     ARRAY['contador', 'contabil', 'contabilidade']),
    (p_client_id, 'Advogado', v_legal_id, 'payable', 'expense', 
     ARRAY['advogado', 'juridico', 'advocacia']),
    (p_client_id, 'Certificado digital', v_legal_id, 'payable', 'expense', 
     ARRAY['certificado', 'digital', 'e-cnpj']);

  -- RECEITAS
  INSERT INTO public.account_categories (client_id, name, account_type, keywords)
  VALUES 
    (p_client_id, 'Venda de Produtos', 'receivable', ARRAY['venda', 'produto']),
    (p_client_id, 'Prestação de Serviços', 'receivable', ARRAY['servico', 'prestacao']),
    (p_client_id, 'Recorrência / Assinatura', 'receivable', ARRAY['recorrencia', 'assinatura', 'mensalidade']),
    (p_client_id, 'Comissão', 'receivable', ARRAY['comissao', 'percentual']),
    (p_client_id, 'Royalties', 'receivable', ARRAY['royalty', 'direito']),
    (p_client_id, 'Reembolsos', 'receivable', ARRAY['reembolso', 'devolucao']);
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_account_categories_updated_at
BEFORE UPDATE ON public.account_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();