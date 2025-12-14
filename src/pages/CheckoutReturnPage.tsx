import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFallback, setShowFallback] = useState(false);

  const source = searchParams.get('source');
  const id = searchParams.get('id');
  const dealId = searchParams.get('dealId');
  const status = searchParams.get('status');
  const plan = searchParams.get('plan');

  useEffect(() => {
    handleReturn();
    
    // Fallback after 8 seconds
    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  const handleReturn = async () => {
    if (status === 'cancel') {
      if (source === 'subscription') {
        navigate('/plans');
      } else if (source === 'deal' && (dealId || id)) {
        const finalId = dealId || id;
        navigate(`/deal/${finalId}`);
      } else {
        navigate('/app');
      }
      return;
    }

    // status === 'success'
    try {
      if (source === 'subscription') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              plan: plan || 'plus',
              plan_status: 'active',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
      } else if (source === 'deal' && (dealId || id)) {
        const finalId = dealId || id;
        await supabase
          .from('deals')
          .update({ status: 'paid' })
          .eq('id', finalId);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }

    // Redirect to dashboard
    setTimeout(() => {
      navigate('/app');
    }, 1000);
  };

  const handleGoBack = () => {
    if (source === 'deal' && (dealId || id)) {
      navigate(`/deal/${dealId || id}`);
    } else if (source === 'subscription') {
      navigate('/plans');
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-lg">Payment received. Redirecting…</p>
      
      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        {showFallback && (
          <Button onClick={() => navigate('/app')}>
            Return to dashboard
          </Button>
        )}
      </div>
    </div>
  );
};

export default CheckoutReturnPage;
