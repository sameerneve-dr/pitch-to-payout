import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BillingState {
  isActive: boolean;
  plan: string;
  customerId: string | null;
  subscriptions: any[];
  loading: boolean;
  error: string | null;
}

export function useBilling() {
  const [billing, setBilling] = useState<BillingState>({
    isActive: false,
    plan: 'free',
    customerId: null,
    subscriptions: [],
    loading: true,
    error: null,
  });

  const fetchBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setBilling(prev => ({ ...prev, loading: false }));
        return;
      }

      const response = await supabase.functions.invoke('get-flowglad-billing', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setBilling({
        isActive: response.data.isActive,
        plan: response.data.plan,
        customerId: response.data.customerId,
        subscriptions: response.data.subscriptions,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching billing:', error);
      setBilling(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch billing',
      }));
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  return { ...billing, refetch: fetchBilling };
}
