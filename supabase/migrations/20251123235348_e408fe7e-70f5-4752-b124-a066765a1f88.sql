-- Tabela de notificações em tempo real
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'alert', 'warning', 'info', 'success'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de score de inadimplência
CREATE TABLE IF NOT EXISTS public.customer_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
  payment_history_score INTEGER,
  delay_frequency_score INTEGER,
  average_delay_days INTEGER,
  total_overdue_amount NUMERIC DEFAULT 0,
  last_payment_date DATE,
  recommendations TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conexões Open Banking
CREATE TABLE IF NOT EXISTS public.open_banking_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  consent_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  consent_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  auto_sync BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de workflow de aprovações
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense', 'account_payable', 'budget'
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  approval_levels JSONB NOT NULL, -- [{level: 1, approver_role: 'manager', required: true}]
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de aprovações
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL, -- 'expense', 'account', 'budget'
  reference_id UUID NOT NULL,
  requester_id UUID REFERENCES auth.users(id),
  current_level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de aprovações
CREATE TABLE IF NOT EXISTS public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID REFERENCES public.approvals(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id),
  level INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'delegated'
  comments TEXT,
  delegated_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos Pix
CREATE TABLE IF NOT EXISTS public.pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL, -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  amount NUMERIC NOT NULL,
  description TEXT,
  qr_code TEXT,
  txid TEXT UNIQUE,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de boletos
CREATE TABLE IF NOT EXISTS public.boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  nosso_numero TEXT UNIQUE,
  codigo_barras TEXT,
  linha_digitavel TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payer_name TEXT NOT NULL,
  payer_document TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de benchmarking
CREATE TABLE IF NOT EXISTS public.industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_sector TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_banking_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for customer_risk_scores
CREATE POLICY "Authenticated users can view risk scores" ON public.customer_risk_scores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage risk scores" ON public.customer_risk_scores
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for open_banking_connections
CREATE POLICY "Authenticated users can view connections" ON public.open_banking_connections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage connections" ON public.open_banking_connections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for approval_workflows
CREATE POLICY "Authenticated users can view workflows" ON public.approval_workflows
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage workflows" ON public.approval_workflows
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for approvals
CREATE POLICY "Users can view approvals" ON public.approvals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create approvals" ON public.approvals
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins and managers can manage approvals" ON public.approvals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for approval_history
CREATE POLICY "Users can view approval history" ON public.approval_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create approval history" ON public.approval_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for pix_payments
CREATE POLICY "Authenticated users can view pix payments" ON public.pix_payments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage pix payments" ON public.pix_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for boletos
CREATE POLICY "Authenticated users can view boletos" ON public.boletos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage boletos" ON public.boletos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financial_manager'::app_role));

-- RLS Policies for industry_benchmarks
CREATE POLICY "Authenticated users can view benchmarks" ON public.industry_benchmarks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage benchmarks" ON public.industry_benchmarks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_customer_risk_scores_customer_id ON public.customer_risk_scores(customer_id);
CREATE INDEX idx_open_banking_connections_client_id ON public.open_banking_connections(client_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_pix_payments_status ON public.pix_payments(status);
CREATE INDEX idx_boletos_status ON public.boletos(status);