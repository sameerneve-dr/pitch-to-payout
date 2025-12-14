import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'plus' | 'pro';
  plan_status: 'active' | 'inactive';
  panels_today: number;
  deals_today: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  maxPanelsPerDay: number;
  maxDealsPerDay: number;
  maxInvestorsInNegotiation: number;
  hasAdvancedTermSheet: boolean;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    }
    
    setProfile(data as Profile | null);
    setLoading(false);
  };

  const getPlanLimits = (): PlanLimits => {
    const plan = profile?.plan || 'free';
    const isActive = profile?.plan_status === 'active';

    if (plan === 'pro' && isActive) {
      return {
        maxPanelsPerDay: Infinity,
        maxDealsPerDay: Infinity,
        maxInvestorsInNegotiation: 5,
        hasAdvancedTermSheet: true
      };
    }

    if (plan === 'plus' && isActive) {
      return {
        maxPanelsPerDay: Infinity,
        maxDealsPerDay: Infinity,
        maxInvestorsInNegotiation: 2,
        hasAdvancedTermSheet: false
      };
    }

    // Free tier
    return {
      maxPanelsPerDay: 1,
      maxDealsPerDay: 1,
      maxInvestorsInNegotiation: 2,
      hasAdvancedTermSheet: false
    };
  };

  const canCreatePanel = (): boolean => {
    if (!profile) return true; // Allow if no profile yet (anonymous)
    const limits = getPlanLimits();
    return profile.panels_today < limits.maxPanelsPerDay;
  };

  const canCreateDeal = (): boolean => {
    if (!profile) return true;
    const limits = getPlanLimits();
    return profile.deals_today < limits.maxDealsPerDay;
  };

  const incrementPanelCount = async () => {
    if (!user || !profile) return;

    await supabase
      .from('profiles')
      .update({ panels_today: profile.panels_today + 1 })
      .eq('user_id', user.id);

    setProfile(prev => prev ? { ...prev, panels_today: prev.panels_today + 1 } : null);
  };

  const incrementDealCount = async () => {
    if (!user || !profile) return;

    await supabase
      .from('profiles')
      .update({ deals_today: profile.deals_today + 1 })
      .eq('user_id', user.id);

    setProfile(prev => prev ? { ...prev, deals_today: prev.deals_today + 1 } : null);
  };

  const resetDemoData = async () => {
    if (!user) return { error: 'Not authenticated' };

    // Delete user's pitches (cascades to panels and deals)
    const { error: deleteError } = await supabase
      .from('pitches')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    // Reset daily counters
    await supabase
      .from('profiles')
      .update({ panels_today: 0, deals_today: 0 })
      .eq('user_id', user.id);

    await fetchProfile();
    return { error: null };
  };

  return {
    profile,
    loading,
    getPlanLimits,
    canCreatePanel,
    canCreateDeal,
    incrementPanelCount,
    incrementDealCount,
    resetDemoData,
    refetch: fetchProfile
  };
}
