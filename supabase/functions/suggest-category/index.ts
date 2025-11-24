import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supplierName, description, accountType, clientId } = await req.json();

    console.log('Suggest category request:', { supplierName, description, accountType, clientId });

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar categorias do cliente
    const { data: categories, error: categoriesError } = await supabase
      .from('account_categories')
      .select('*')
      .eq('client_id', clientId)
      .eq('account_type', accountType)
      .eq('active', true);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!categories || categories.length === 0) {
      console.log('No categories found for client');
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Primeiro, tentar match direto por fornecedor
    const supplierLower = supplierName?.toLowerCase() || '';
    for (const category of categories) {
      if (category.suppliers && Array.isArray(category.suppliers)) {
        for (const supplier of category.suppliers) {
          if (supplierLower.includes(supplier.toLowerCase()) || supplier.toLowerCase().includes(supplierLower)) {
            console.log(`Direct supplier match found: ${category.name}`);
            return new Response(
              JSON.stringify({
                categoryId: category.id,
                categoryName: category.name,
                expenseType: category.expense_type,
                confidence: 0.95,
                method: 'direct_supplier_match'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Segundo, tentar match por keywords
    const textToMatch = `${supplierLower} ${description?.toLowerCase() || ''}`;
    for (const category of categories) {
      if (category.keywords && Array.isArray(category.keywords)) {
        for (const keyword of category.keywords) {
          if (textToMatch.includes(keyword.toLowerCase())) {
            console.log(`Keyword match found: ${category.name} (keyword: ${keyword})`);
            return new Response(
              JSON.stringify({
                categoryId: category.id,
                categoryName: category.name,
                expenseType: category.expense_type,
                confidence: 0.80,
                method: 'keyword_match'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Se não houve match direto, usar AI para sugestão mais sofisticada
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, returning no suggestion');
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoriesForAI = categories.map(c => ({
      id: c.id,
      name: c.name,
      expense_type: c.expense_type,
      keywords: c.keywords || [],
      suppliers: c.suppliers || []
    }));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de categorização financeira. Baseado no fornecedor e descrição da conta, sugira a categoria mais apropriada da lista fornecida. Responda APENAS com o ID da categoria sugerida e um score de confiança de 0 a 1, no formato JSON: {"categoryId": "uuid", "confidence": 0.85}. Se não houver boa correspondência, retorne {"categoryId": null, "confidence": 0}.`
          },
          {
            role: 'user',
            content: `Fornecedor: ${supplierName || 'não informado'}
Descrição: ${description || 'não informada'}

Categorias disponíveis:
${JSON.stringify(categoriesForAI, null, 2)}

Qual categoria sugere?`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_category',
              description: 'Retorna a sugestão de categoria',
              parameters: {
                type: 'object',
                properties: {
                  categoryId: { type: 'string', nullable: true },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['categoryId', 'confidence'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_category' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiResult));

    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.log('No tool call in AI response');
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiSuggestion = JSON.parse(toolCall.function.arguments);
    
    if (!aiSuggestion.categoryId) {
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestedCategory = categories.find(c => c.id === aiSuggestion.categoryId);
    if (!suggestedCategory) {
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        categoryId: suggestedCategory.id,
        categoryName: suggestedCategory.name,
        expenseType: suggestedCategory.expense_type,
        confidence: aiSuggestion.confidence,
        method: 'ai_suggestion'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-category:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
