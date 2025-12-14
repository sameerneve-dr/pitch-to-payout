import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Confetti from '@/components/Confetti';
import { playCelebrationSound } from '@/lib/sounds';
import { Check, DollarSign, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface DealTerms {
  askAmount: number;
  equityPercent: number;
  totalOffered: number;
  postMoneyValuation: number;
  allocations: any[];
}

interface Deal {
  id: string;
  deal_terms: DealTerms;
  panel: {
    pitch: {
      startup_name: string | null;
    };
  };
}

type VerificationStatus = 'verifying' | 'success' | 'error' | 'pending';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const source = searchParams.get('source') || 'deal';
  const dealId = searchParams.get('deal_id');
  const plan = searchParams.get('plan');
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      setStatus('verifying');

      // For deal source, mark the deal as paid directly
      // The Flowglad redirect means payment was successful
      if (source === 'deal' && dealId) {
        await supabase
          .from('deals')
          .update({ status: 'paid' })
          .eq('id', dealId);
        
        await fetchDeal();
        setStatus('success');
        setShowConfetti(true);
        playCelebrationSound();
        return;
      }

      // For subscription source, update profile
      if (source === 'subscription' && plan) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              plan: plan,
              plan_status: 'active',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });
        }
        
        setStatus('success');
        setShowConfetti(true);
        playCelebrationSound();
        
        // Redirect to app after showing success
        setTimeout(() => {
          navigate('/app');
        }, 3000);
        return;
      }

      // Fallback - just show success
      setStatus('success');
      setShowConfetti(true);
      playCelebrationSound();
      
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  };

  const fetchDeal = async () => {
    if (!dealId) return;
    
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          panel:panels(
            pitch:pitches(startup_name)
          )
        `)
        .eq('id', dealId)
        .single();

      if (!error && data) {
        setDeal(data as unknown as Deal);
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRetry = () => {
    verifyPayment();
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Payment Verification Failed</CardTitle>
            <CardDescription className="text-destructive">
              {errorMessage || 'We could not verify your payment. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
            <Link to={source === 'subscription' ? '/plans' : '/app'}>
              <Button variant="outline" className="w-full">
                Go Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Payment Processing</CardTitle>
            <CardDescription>
              Your payment is still being processed. Please check back in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRetry} className="w-full">
              Check Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - Subscription
  if (source === 'subscription') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Confetti active={showConfetti} />
        <Card className="max-w-lg w-full text-center animate-scale-in">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <Badge className="mx-auto mb-2 bg-primary/20 text-primary border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Payment Verified ✅
            </Badge>
            <CardTitle className="text-3xl">Subscription Activated!</CardTitle>
            <CardDescription className="text-lg">
              Welcome to Investor Panel {plan?.charAt(0).toUpperCase()}{plan?.slice(1)}!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/app">
                <Button className="w-full" size="lg">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - Deal
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Confetti active={showConfetti} />
      <Card className="max-w-lg w-full text-center animate-scale-in">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <Badge className="mx-auto mb-2 bg-primary/20 text-primary border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Payment Verified ✅
          </Badge>
          <CardTitle className="text-3xl">Investment Complete!</CardTitle>
          <CardDescription className="text-lg">
            {deal?.panel.pitch.startup_name 
              ? `Congratulations on funding ${deal.panel.pitch.startup_name}!`
              : 'Your investment has been processed.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {deal && deal.deal_terms && (
            <div className="bg-accent/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary">
                <DollarSign className="w-8 h-8" />
                <span className="text-4xl font-bold">
                  {formatCurrency(deal.deal_terms.askAmount)}
                </span>
              </div>
              <p className="text-muted-foreground">
                moved in one click
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-2xl font-bold">{deal.deal_terms.equityPercent}%</p>
                  <p className="text-sm text-muted-foreground">Equity</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{deal.deal_terms.allocations?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Investors</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-muted-foreground text-sm">
            This is a test transaction. In production, funds would be transferred to your connected account.
          </p>

          <div className="flex flex-col gap-3">
            <Link to="/new">
              <Button className="w-full" size="lg">
                Run Another Pitch
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="outline" className="w-full">
                View History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessPage;
