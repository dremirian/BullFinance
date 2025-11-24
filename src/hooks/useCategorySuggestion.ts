import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  expense_type: 'cost' | 'expense' | null;
}

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  expenseType: 'cost' | 'expense' | null;
  confidence: number;
  method: string;
}

export function useCategorySuggestion(
  clientId: string | undefined,
  accountType: 'payable' | 'receivable',
  supplierName: string,
  description: string
) {
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar categorias disponíveis
  useEffect(() => {
    if (!clientId) return;

    const loadCategories = async () => {
      const { data } = await supabase
        .from('account_categories')
        .select('id, name, parent_id, expense_type')
        .eq('client_id', clientId)
        .eq('account_type', accountType)
        .eq('active', true)
        .order('name');

      if (data) {
        setCategories(data as Category[]);
      }
    };

    void loadCategories();
  }, [clientId, accountType]);

  // Sugerir categoria quando fornecedor ou descrição mudar
  useEffect(() => {
    if (!clientId || (!supplierName && !description)) {
      setSuggestion(null);
      return;
    }

    const suggestCategory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-category', {
          body: {
            supplierName,
            description,
            accountType,
            clientId,
          },
        });

        if (error) {
          console.error('Error suggesting category:', error);
          setSuggestion(null);
        } else if (data?.categoryId) {
          setSuggestion(data);
        } else {
          setSuggestion(null);
        }
      } catch (error) {
        console.error('Error suggesting category:', error);
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce para evitar muitas requisições
    const timer = setTimeout(suggestCategory, 500);
    return () => clearTimeout(timer);
  }, [clientId, supplierName, description, accountType]);

  return { suggestion, categories, loading };
}
