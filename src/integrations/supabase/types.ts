export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_categories: {
        Row: {
          account_type: string
          active: boolean | null
          client_id: string | null
          created_at: string | null
          expense_type: string | null
          id: string
          keywords: string[] | null
          name: string
          parent_id: string | null
          suppliers: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_type: string
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          expense_type?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          parent_id?: string | null
          suppliers?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          expense_type?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          parent_id?: string | null
          suppliers?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "account_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          amount: number
          attachment_url: string | null
          bank_account_id: string | null
          category_id: string | null
          client_id: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          description: string
          due_date: string
          expense_type: string | null
          forma_pagamento: string | null
          id: string
          invoice_number: string | null
          is_fixa: boolean | null
          is_recorrente: boolean | null
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          recurrence_end_date: string | null
          status: Database["public"]["Enums"]["account_status"]
          supplier_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          description: string
          due_date: string
          expense_type?: string | null
          forma_pagamento?: string | null
          id?: string
          invoice_number?: string | null
          is_fixa?: boolean | null
          is_recorrente?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_end_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          description?: string
          due_date?: string
          expense_type?: string | null
          forma_pagamento?: string | null
          id?: string
          invoice_number?: string | null
          is_fixa?: boolean | null
          is_recorrente?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          recurrence_end_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          account_id: string | null
          bank_account_id: string | null
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          mensagem: string
          severity: string
          tipo: string
          titulo: string
          visualizado: boolean | null
        }
        Insert: {
          account_id?: string | null
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mensagem: string
          severity: string
          tipo: string
          titulo: string
          visualizado?: boolean | null
        }
        Update: {
          account_id?: string | null
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          mensagem?: string
          severity?: string
          tipo?: string
          titulo?: string
          visualizado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_history: {
        Row: {
          action: string
          approval_id: string | null
          approver_id: string | null
          comments: string | null
          created_at: string | null
          delegated_to: string | null
          id: string
          level: number
        }
        Insert: {
          action: string
          approval_id?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          level: number
        }
        Update: {
          action?: string
          approval_id?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          active: boolean | null
          approval_levels: Json
          client_id: string | null
          created_at: string | null
          id: string
          max_amount: number | null
          min_amount: number | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          approval_levels: Json
          client_id?: string | null
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          approval_levels?: Json
          client_id?: string | null
          created_at?: string | null
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "approval_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          client_id: string | null
          created_at: string | null
          current_level: number | null
          id: string
          reference_id: string
          reference_type: string
          requester_id: string | null
          status: string | null
          updated_at: string | null
          workflow_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          reference_id: string
          reference_type: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          reference_id?: string
          reference_type?: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          active: boolean
          agency: string | null
          bank_name: string
          client_id: string | null
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          name: string
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type: string
          active?: boolean
          agency?: string | null
          bank_name: string
          client_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          active?: boolean
          agency?: string | null
          bank_name?: string
          client_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string
          client_id: string | null
          created_at: string
          description: string
          id: string
          imported_at: string
          matched_account_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_account_id: string
          client_id?: string | null
          created_at?: string
          description: string
          id?: string
          imported_at?: string
          matched_account_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string
          client_id?: string | null
          created_at?: string
          description?: string
          id?: string
          imported_at?: string
          matched_account_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "bank_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_account_id_fkey"
            columns: ["matched_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          account_id: string | null
          amount: number
          client_id: string | null
          codigo_barras: string | null
          created_at: string | null
          due_date: string
          id: string
          linha_digitavel: string | null
          nosso_numero: string | null
          paid_at: string | null
          payer_document: string
          payer_name: string
          status: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          client_id?: string | null
          codigo_barras?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          linha_digitavel?: string | null
          nosso_numero?: string | null
          paid_at?: string | null
          payer_document: string
          payer_name: string
          status?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          client_id?: string | null
          codigo_barras?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          linha_digitavel?: string | null
          nosso_numero?: string | null
          paid_at?: string | null
          payer_document?: string
          payer_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "boletos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          actual_amount: number
          category: string
          client_id: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          month: number | null
          name: string
          notes: string | null
          planned_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          actual_amount?: number
          category: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          month?: number | null
          name: string
          notes?: string | null
          planned_amount: number
          updated_at?: string
          year: number
        }
        Update: {
          actual_amount?: number
          category?: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          month?: number | null
          name?: string
          notes?: string | null
          planned_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow: {
        Row: {
          account_id: string | null
          amount: number
          bank_account_id: string | null
          category: string
          client_id: string | null
          cost_center_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          is_projection: boolean
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bank_account_id?: string | null
          category: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          is_projection?: boolean
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bank_account_id?: string | null
          category?: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_projection?: boolean
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          active: boolean
          client_id: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cost_centers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_risk_scores: {
        Row: {
          average_delay_days: number | null
          client_id: string | null
          created_at: string | null
          customer_id: string | null
          delay_frequency_score: number | null
          id: string
          last_payment_date: string | null
          payment_history_score: number | null
          recommendations: string | null
          risk_level: string | null
          score: number | null
          total_overdue_amount: number | null
          updated_at: string | null
        }
        Insert: {
          average_delay_days?: number | null
          client_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delay_frequency_score?: number | null
          id?: string
          last_payment_date?: string | null
          payment_history_score?: number | null
          recommendations?: string | null
          risk_level?: string | null
          score?: number | null
          total_overdue_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          average_delay_days?: number | null
          client_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          delay_frequency_score?: number | null
          id?: string
          last_payment_date?: string | null
          payment_history_score?: number | null
          recommendations?: string | null
          risk_level?: string | null
          score?: number | null
          total_overdue_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "customer_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_risk_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean | null
          address: string | null
          client_id: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          client_id: string | null
          cost_center_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_benchmarks: {
        Row: {
          created_at: string | null
          id: string
          industry_sector: string
          metric_name: string
          metric_value: number
          period_month: number
          period_year: number
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry_sector: string
          metric_name: string
          metric_value: number
          period_month: number
          period_year: number
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          industry_sector?: string
          metric_name?: string
          metric_value?: number
          period_month?: number
          period_year?: number
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          client_id: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      open_banking_connections: {
        Row: {
          access_token: string | null
          auto_sync: boolean | null
          bank_account_id: string | null
          bank_code: string
          bank_name: string
          client_id: string | null
          consent_expires_at: string | null
          consent_id: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          auto_sync?: boolean | null
          bank_account_id?: string | null
          bank_code: string
          bank_name: string
          client_id?: string | null
          consent_expires_at?: string | null
          consent_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          auto_sync?: boolean | null
          bank_account_id?: string | null
          bank_code?: string
          bank_name?: string
          client_id?: string | null
          consent_expires_at?: string | null
          consent_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_banking_connections_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_banking_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "open_banking_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payments: {
        Row: {
          account_id: string | null
          amount: number
          client_id: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          paid_at: string | null
          pix_key: string
          pix_key_type: string
          qr_code: string | null
          status: string | null
          txid: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          pix_key: string
          pix_key_type: string
          qr_code?: string | null
          status?: string | null
          txid?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          pix_key?: string
          pix_key_type?: string
          qr_code?: string | null
          status?: string | null
          txid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pix_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provisions: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string
          description: string
          expected_payment_date: string
          id: string
          notes: string | null
          paid: boolean
          paid_date: string | null
          provision_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          description: string
          expected_payment_date: string
          id?: string
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          provision_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          expected_payment_date?: string
          id?: string
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          provision_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "provisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_rules: {
        Row: {
          account_type: string
          active: boolean | null
          auto_match: boolean | null
          client_id: string | null
          created_at: string | null
          default_category: string | null
          default_cost_center_id: string | null
          id: string
          name: string
          pattern: string
          updated_at: string | null
        }
        Insert: {
          account_type: string
          active?: boolean | null
          auto_match?: boolean | null
          client_id?: string | null
          created_at?: string | null
          default_category?: string | null
          default_cost_center_id?: string | null
          id?: string
          name: string
          pattern: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          active?: boolean | null
          auto_match?: boolean | null
          client_id?: string | null
          created_at?: string | null
          default_category?: string | null
          default_cost_center_id?: string | null
          id?: string
          name?: string
          pattern?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "reconciliation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_rules_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          client_id: string | null
          contact_person: string | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          client_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_financial_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_financial_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          contas_atrasadas: number | null
          last_updated: string | null
          saldo_total_bancos: number | null
          total_a_pagar: number | null
          total_a_receber: number | null
          total_accounts: number | null
          total_bank_accounts: number | null
          total_despesas: number | null
          total_receitas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_default_categories: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      generate_alerts: { Args: never; Returns: undefined }
      get_all_clients_summary: {
        Args: never
        Returns: {
          client_id: string
          client_name: string
          contas_atrasadas: number
          last_updated: string
          saldo_total_bancos: number
          total_a_pagar: number
          total_a_receber: number
          total_accounts: number
          total_bank_accounts: number
          total_despesas: number
          total_receitas: number
        }[]
      }
      get_client_stats: {
        Args: { client_uuid: string }
        Returns: {
          contas_atrasadas: number
          saldo_atual: number
          taxa_inadimplencia: number
          total_despesas: number
          total_receitas: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_client_summary: { Args: never; Returns: undefined }
    }
    Enums: {
      account_status: "pending" | "paid" | "overdue" | "cancelled"
      account_type: "payable" | "receivable"
      app_role: "admin" | "financial_manager" | "accountant" | "viewer"
      expense_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "reimbursed"
      payment_method:
        | "cash"
        | "credit_card"
        | "debit_card"
        | "bank_transfer"
        | "pix"
        | "boleto"
        | "check"
      recurrence_type: "none" | "daily" | "weekly" | "monthly" | "yearly"
      transaction_status: "pending" | "reconciled" | "ignored"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "paid", "overdue", "cancelled"],
      account_type: ["payable", "receivable"],
      app_role: ["admin", "financial_manager", "accountant", "viewer"],
      expense_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "reimbursed",
      ],
      payment_method: [
        "cash",
        "credit_card",
        "debit_card",
        "bank_transfer",
        "pix",
        "boleto",
        "check",
      ],
      recurrence_type: ["none", "daily", "weekly", "monthly", "yearly"],
      transaction_status: ["pending", "reconciled", "ignored"],
    },
  },
} as const
