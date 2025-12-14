import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Crown, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: billingLoading } = useBilling();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Redirect if already subscribed
  useEffect(() => {
    if (authLoading || billingLoading) return;

    if (user && !user.is_anonymous && isActive) {
      navigate('/app');
    }
  }, [user, authLoading, isActive, billingLoading, navigate]);

  const handleSubscribe = async (plan: 'plus' | 'pro') => {
    if (!user) {
      toast.error('Please sign up first');
      navigate('/signup');
      return;
    }

    if (user.is_anonymous) {
      toast.error('Please create an account to subscribe');
      navigate('/signup');
      return;
    }

    setLoadingPlan(plan);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Unlock the full power of AI investor panels
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Plus Plan */}
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Plus
              </CardTitle>
              <CardDescription>For founders getting started</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold text-foreground">$19</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Unlimited investor panels
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Unlimited deals
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Up to 2 investors in negotiation
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Basic term sheets
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Demo data included
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleSubscribe('plus')}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === 'plus' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Plus
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-primary relative shadow-[var(--neon-primary)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-[var(--neon-primary)]">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Pro
              </CardTitle>
              <CardDescription>For serious founders</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold text-foreground">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Everything in Plus
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Up to 5 investors in negotiation
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Advanced term sheet sliders
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Priority AI processing
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  Export deal documents
                </li>
              </ul>
              <Button 
                className="w-full shadow-[var(--neon-primary)]"
                onClick={() => handleSubscribe('pro')}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === 'pro' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Pro
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {!user && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
