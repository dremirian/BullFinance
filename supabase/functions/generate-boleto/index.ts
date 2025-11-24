import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar nosso número (simulado)
function generateNossoNumero(): string {
  return Date.now().toString() + Math.random().toString().substr(2, 5);
}

// Função para calcular dígito verificador do código de barras
function calculateDigit(code: string): string {
  const weights = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    sum += parseInt(code[i]) * weights[i];
  }
  const digit = 11 - (sum % 11);
  return digit > 9 ? '1' : digit.toString();
}

// Gerar código de barras simulado
function generateBarcode(amount: number, dueDate: string, nossoNumero: string): string {
  const bankCode = '001'; // Banco do Brasil simulado
  const currency = '9';
  
  // Calcular fator de vencimento (dias desde 07/10/1997)
  const baseDate = new Date('1997-10-07');
  const due = new Date(dueDate);
  const factor = Math.floor((due.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Valor sem pontos ou vírgulas (10 dígitos)
  const value = Math.floor(amount * 100).toString().padStart(10, '0');
  
  // Montar código sem dígito verificador
  const codeWithoutDigit = `${bankCode}${currency}${factor.toString().padStart(4, '0')}${value}${nossoNumero.padStart(10, '0')}001`;
  
  // Calcular dígito verificador
  const digit = calculateDigit(codeWithoutDigit);
  
  // Código completo
  const barcode = `${bankCode}${currency}${digit}${factor.toString().padStart(4, '0')}${value}${nossoNumero.padStart(10, '0')}001`;
  
  return barcode;
}

// Converter código de barras para linha digitável
function barcodeToDigitableLine(barcode: string): string {
  const field1 = barcode.substr(0, 4) + barcode.substr(19, 5);
  const field2 = barcode.substr(24, 10);
  const field3 = barcode.substr(34, 10);
  const field4 = barcode.substr(4, 1);
  const field5 = barcode.substr(5, 14);
  
  return `${field1} ${field2} ${field3} ${field4} ${field5}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountId, clientId, payerName, payerDocument } = await req.json();

    // Buscar dados da conta
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError) throw accountError;

    // Gerar nosso número
    const nossoNumero = generateNossoNumero();
    
    // Gerar código de barras
    const codigoBarras = generateBarcode(account.amount, account.due_date, nossoNumero);
    
    // Gerar linha digitável
    const linhaDigitavel = barcodeToDigitableLine(codigoBarras);

    // Salvar boleto
    const { data: boleto, error: boletoError } = await supabase
      .from('boletos')
      .insert({
        client_id: clientId,
        account_id: accountId,
        nosso_numero: nossoNumero,
        codigo_barras: codigoBarras,
        linha_digitavel: linhaDigitavel,
        amount: account.amount,
        due_date: account.due_date,
        payer_name: payerName,
        payer_document: payerDocument,
        status: 'pending'
      })
      .select()
      .single();

    if (boletoError) throw boletoError;

    // Criar notificação
    await supabase
      .from('notifications')
      .insert({
        client_id: clientId,
        title: 'Boleto Gerado',
        message: `Boleto de R$ ${account.amount.toFixed(2)} gerado para ${payerName}`,
        type: 'success',
        priority: 'medium',
        action_url: `/accounts`
      });

    return new Response(
      JSON.stringify(boleto),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating boleto:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});