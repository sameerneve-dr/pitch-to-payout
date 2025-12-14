import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const source = searchParams.get('source');
  const dealId = searchParams.get('deal_id');
  const plan = searchParams.get('plan');

  useEffect(() => {
    activate();
  }, []);

  const activate = async () => {
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
            }, { onConflict: 'user_id' });
        }
      } else if (source === 'deal' && dealId) {
        await supabase
          .from('deals')
          .update({ status: 'paid' })
          .eq('id', dealId);
      }
    } catch (err) {
      console.error('Activation error:', err);
    }
    
    setDone(true);
    setTimeout(() => navigate('/app'), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      {!done ? (
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-primary" />
        </div>
      )}
      <p className="text-xl">{done ? 'Payment complete! Redirecting…' : 'Processing…'}</p>
      <Button onClick={() => navigate('/app')} variant="outline">
        Continue to Dashboard
      </Button>
    </div>
  );
};

export default SuccessPage;
