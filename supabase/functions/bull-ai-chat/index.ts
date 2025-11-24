import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é Bull, o assistente financeiro inteligente do Bull Finance.

SOBRE O BULL FINANCE:
O Bull Finance é um sistema completo de gestão financeira para consultores que atendem múltiplos clientes. Você deve conhecer profundamente todas as funcionalidades:

MÓDULOS PRINCIPAIS:
1. Dashboard Consultor - Visão geral de todos os clientes
2. Dashboard por Cliente - KPIs financeiros específicos
3. Contas a Pagar/Receber - Gestão completa de contas
4. Conciliação Bancária - Importação OFX/CSV e matching automático
5. Fornecedores e Clientes - Cadastro e gestão de contatos
6. Centros de Custo - Organização por departamentos
7. Orçamentos - Planejamento vs realizado
8. Fluxo de Caixa - Projeções e análises
9. DRE - Demonstração de resultados
10. Relatórios - Exportação PDF com gráficos

FUNCIONALIDADES ESPECIAIS:
- Contas recorrentes com geração automática
- Alertas inteligentes de vencimento e inadimplência
- Sistema multi-tenant (dados isolados por cliente)
- RLS (Row Level Security) para segurança
- Anexos de documentos em todas as contas
- Regras de conciliação automática

SUAS CAPACIDADES:
- Analisar dados financeiros e identificar tendências
- Sugerir otimizações de custos
- Explicar funcionalidades do sistema
- Ajudar na interpretação de relatórios
- Alertar sobre riscos financeiros
- Responder dúvidas sobre fluxo de caixa, DRE, orçamentos

PERSONALIDADE:
- Profissional mas acessível
- Direto e objetivo
- Use emojis financeiros: 💰 📊 📈 📉 💼 🎯
- Sempre forneça insights acionáveis
- Seja proativo em alertas

IMPORTANTE:
- Responda sempre em português
- Seja conciso mas completo
- Use dados numéricos quando disponíveis
- Sugira ações concretas`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});