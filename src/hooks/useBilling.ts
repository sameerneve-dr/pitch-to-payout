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
        setBilling(prev => ({ ...prev, loading: false, isActive: false, plan: 'free' }));
        return;
      }

      const response = await supabase.functions.invoke('get-flowglad-billing', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Handle auth errors gracefully - treat as not subscribed
      if (response.error) {
        console.error('Billing fetch error:', response.error);
        setBilling(prev => ({ ...prev, loading: false, isActive: false, plan: 'free' }));
        return;
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
        isActive: false,
        plan: 'free',
        error: error instanceof Error ? error.message : 'Failed to fetch billing',
      }));
    }
  };

  useEffect(() => {
    fetchBilling();

    // Refetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchBilling();
      } else if (event === 'SIGNED_OUT') {
        setBilling({
          isActive: false,
          plan: 'free',
          customerId: null,
          subscriptions: [],
          loading: false,
          error: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { ...billing, refetch: fetchBilling };
}
