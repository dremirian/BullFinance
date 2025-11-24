import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simular transações bancárias (em produção, usar API real Open Banking Brasil)
function generateMockTransactions(bankAccountId: string, clientId: string) {
  const transactions = [];
  const today = new Date();
  
  // Gerar 5 transações aleatórias dos últimos 7 dias
  for (let i = 0; i < 5; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const transactionDate = new Date(today);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);
    
    const isCredit = Math.random() > 0.5;
    const amount = isCredit 
      ? Math.random() * 5000 + 500 
      : -(Math.random() * 3000 + 200);
    
    const descriptions = [
      'PIX Recebido',
      'TED Recebida',
      'Pagamento Boleto',
      'Transferência Enviada',
      'Pagamento Fornecedor',
      'Recebimento Cliente'
    ];
    
    transactions.push({
      bank_account_id: bankAccountId,
      client_id: clientId,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      amount: Math.round(amount * 100) / 100,
      transaction_date: transactionDate.toISOString().split('T')[0],
      status: 'pending'
    });
  }
  
  return transactions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { connectionId } = await req.json();

    // Buscar conexão Open Banking
    const { data: connection, error: connectionError } = await supabase
      .from('open_banking_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError) throw connectionError;

    // Gerar transações simuladas
    const mockTransactions = generateMockTransactions(
      connection.bank_account_id,
      connection.client_id
    );

    // Inserir transações
    const { error: transactionsError } = await supabase
      .from('bank_transactions')
      .insert(mockTransactions);

    if (transactionsError) throw transactionsError;

    // Atualizar última sincronização
    const { error: updateError } = await supabase
      .from('open_banking_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;

    // Calcular novo saldo (simulado)
    const totalChange = mockTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', connection.bank_account_id)
      .single();

    const newBalance = (bankAccount?.current_balance || 0) + totalChange;

    await supabase
      .from('bank_accounts')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.bank_account_id);

    // Criar notificação
    await supabase
      .from('notifications')
      .insert({
        client_id: connection.client_id,
        title: 'Sincronização Open Banking',
        message: `${mockTransactions.length} novas transações importadas. Novo saldo: R$ ${newBalance.toFixed(2)}`,
        type: 'info',
        priority: 'medium',
        action_url: `/bank-reconciliation`
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionsImported: mockTransactions.length,
        newBalance: newBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing Open Banking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});