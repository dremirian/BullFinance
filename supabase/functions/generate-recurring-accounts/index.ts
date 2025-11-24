import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('[Recurring Accounts] Starting generation...')

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Buscar contas recorrentes ativas
    const { data: recurringAccounts, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_recorrente', true)
      .eq('status', 'pending')
      .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${todayStr}`)

    if (fetchError) {
      console.error('[Recurring Accounts] Error fetching:', fetchError)
      throw fetchError
    }

    console.log(`[Recurring Accounts] Found ${recurringAccounts?.length || 0} recurring accounts`)

    const accountsToCreate: any[] = []

    for (const account of recurringAccounts || []) {
      const dueDate = new Date(account.due_date)
      const lastDueDate = dueDate
      
      // Determinar próxima data de vencimento
      let nextDueDate: Date | null = null
      
      switch (account.recurrence) {
        case 'daily':
          nextDueDate = new Date(lastDueDate)
          nextDueDate.setDate(nextDueDate.getDate() + 1)
          break
        case 'weekly':
          nextDueDate = new Date(lastDueDate)
          nextDueDate.setDate(nextDueDate.getDate() + 7)
          break
        case 'monthly':
          nextDueDate = new Date(lastDueDate)
          nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          break
        case 'yearly':
          nextDueDate = new Date(lastDueDate)
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
          break
        default:
          continue
      }

      if (!nextDueDate) continue

      // Verificar se próxima data é hoje ou passou
      if (nextDueDate <= today) {
        console.log(`[Recurring Accounts] Generating next occurrence for: ${account.description}`)
        
        // Verificar se já existe conta para essa data
        const { data: existing } = await supabase
          .from('accounts')
          .select('id')
          .eq('client_id', account.client_id)
          .eq('description', account.description)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .single()

        if (!existing) {
          accountsToCreate.push({
            client_id: account.client_id,
            type: account.type,
            description: account.description,
            amount: account.amount,
            due_date: nextDueDate.toISOString().split('T')[0],
            status: 'pending',
            payment_method: account.payment_method,
            cost_center_id: account.cost_center_id,
            bank_account_id: account.bank_account_id,
            contact_name: account.contact_name,
            contact_email: account.contact_email,
            contact_phone: account.contact_phone,
            is_recorrente: true,
            is_fixa: account.is_fixa,
            recurrence: account.recurrence,
            recurrence_end_date: account.recurrence_end_date,
            created_by: account.created_by,
            supplier_id: account.supplier_id,
            customer_id: account.customer_id,
            notes: `Gerado automaticamente da recorrência`,
          })
        }
      }
    }

    if (accountsToCreate.length > 0) {
      console.log(`[Recurring Accounts] Creating ${accountsToCreate.length} new accounts`)
      
      const { error: insertError } = await supabase
        .from('accounts')
        .insert(accountsToCreate)

      if (insertError) {
        console.error('[Recurring Accounts] Error inserting:', insertError)
        throw insertError
      }

      console.log('[Recurring Accounts] Successfully created accounts')
    } else {
      console.log('[Recurring Accounts] No new accounts to create')
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: accountsToCreate.length,
        message: `Successfully generated ${accountsToCreate.length} recurring accounts`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('[Recurring Accounts] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
