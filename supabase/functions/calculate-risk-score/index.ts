import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { customerId } = await req.json();

    // Buscar histórico de pagamentos do cliente
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('type', 'receivable');

    if (accountsError) throw accountsError;

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          score: 100, 
          risk_level: 'low',
          message: 'Cliente sem histórico de pagamentos' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular métricas
    const totalAccounts = accounts.length;
    const paidAccounts = accounts.filter(a => a.status === 'paid').length;
    const overdueAccounts = accounts.filter(a => a.status === 'overdue').length;
    
    let totalDelayDays = 0;
    let delayCount = 0;
    let totalOverdueAmount = 0;
    let lastPaymentDate: string | null = null;

    accounts.forEach(account => {
      if (account.status === 'overdue') {
        const dueDate = new Date(account.due_date);
        const today = new Date();
        const delayDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDelayDays += delayDays;
        delayCount++;
        totalOverdueAmount += account.amount;
      }
      
      if (account.payment_date && (!lastPaymentDate || new Date(account.payment_date) > new Date(lastPaymentDate))) {
        lastPaymentDate = account.payment_date;
      }
    });

    const averageDelayDays = delayCount > 0 ? Math.floor(totalDelayDays / delayCount) : 0;
    const paymentRate = totalAccounts > 0 ? (paidAccounts / totalAccounts) * 100 : 100;
    const overdueRate = totalAccounts > 0 ? (overdueAccounts / totalAccounts) * 100 : 0;

    // Calcular score (0-100, onde 100 é melhor)
    let paymentHistoryScore = Math.floor(paymentRate);
    let delayFrequencyScore = Math.max(0, 100 - (overdueRate * 2));
    
    // Penalização por atraso médio
    let delayPenalty = 0;
    if (averageDelayDays > 60) delayPenalty = 40;
    else if (averageDelayDays > 30) delayPenalty = 25;
    else if (averageDelayDays > 15) delayPenalty = 15;
    else if (averageDelayDays > 7) delayPenalty = 10;

    const finalScore = Math.max(0, Math.floor((paymentHistoryScore + delayFrequencyScore) / 2 - delayPenalty));

    // Determinar nível de risco
    let riskLevel = 'low';
    let recommendations = 'Cliente confiável com bom histórico de pagamentos.';

    if (finalScore < 30) {
      riskLevel = 'critical';
      recommendations = 'CRÍTICO: Cliente com alto risco de inadimplência. Considere suspender crédito e negociar dívidas pendentes.';
    } else if (finalScore < 50) {
      riskLevel = 'high';
      recommendations = 'ALTO RISCO: Monitorar de perto. Considere reduzir limite de crédito e solicitar garantias.';
    } else if (finalScore < 70) {
      riskLevel = 'medium';
      recommendations = 'MÉDIO RISCO: Cliente requer atenção. Enviar lembretes antes do vencimento e acompanhar pagamentos.';
    }

    // Salvar ou atualizar score
    const { data: customer } = await supabase
      .from('customers')
      .select('client_id')
      .eq('id', customerId)
      .single();

    const scoreData = {
      customer_id: customerId,
      client_id: customer?.client_id,
      score: finalScore,
      risk_level: riskLevel,
      payment_history_score: paymentHistoryScore,
      delay_frequency_score: delayFrequencyScore,
      average_delay_days: averageDelayDays,
      total_overdue_amount: totalOverdueAmount,
      last_payment_date: lastPaymentDate,
      recommendations: recommendations,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('customer_risk_scores')
      .upsert(scoreData, { onConflict: 'customer_id' });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify(scoreData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});