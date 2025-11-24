import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar QR Code simulado (em produção, usar API real do banco)
function generateQRCode(pixKey: string, amount: number, description: string): string {
  const payload = `00020126${pixKey.length.toString().padStart(2, '0')}${pixKey}5204000053039865802BR5925Bull Finance Pagamento6014BELO HORIZONTE62070503***6304`;
  return btoa(payload); // Base64 simulado
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountId, pixKey, pixKeyType, clientId } = await req.json();

    // Buscar dados da conta
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError) throw accountError;

    // Gerar TXID único
    const txid = `PIX${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Gerar QR Code
    const qrCode = generateQRCode(pixKey, account.amount, account.description);
    
    // Data de expiração (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Salvar pagamento Pix
    const { data: pixPayment, error: pixError } = await supabase
      .from('pix_payments')
      .insert({
        client_id: clientId,
        account_id: accountId,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        amount: account.amount,
        description: account.description,
        qr_code: qrCode,
        txid: txid,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (pixError) throw pixError;

    // Criar notificação
    await supabase
      .from('notifications')
      .insert({
        client_id: clientId,
        title: 'PIX Gerado',
        message: `PIX de R$ ${account.amount.toFixed(2)} gerado para ${account.contact_name}`,
        type: 'success',
        priority: 'medium',
        action_url: `/accounts`
      });

    return new Response(
      JSON.stringify({
        ...pixPayment,
        copyPaste: `00020126${pixKey.length.toString().padStart(2, '0')}${pixKey}5204000053039865802BR5925Bull Finance6014BELO HORIZONTE62070503***6304${txid}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating PIX:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});