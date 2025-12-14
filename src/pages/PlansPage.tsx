import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Waves, Check, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const PlansPage = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { isActive, plan: currentPlan, loading: billingLoading } = useBilling();
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleFreePlan = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    // Free users go straight to dashboard
    navigate('/app');
  };

  const handleSubscribe = async (plan: 'plus' | 'pro') => {
    if (!user || !session) {
      navigate('/signup');
      return;
    }

    setSubscribing(plan);

    // Simulate payment success - skip Flowglad checkout
    setTimeout(() => {
      toast.success('Payment successful!');
      navigate(`/app?source=subscription&plan=${plan}`);
    }, 1000);
  };

  if (authLoading || billingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Try before you buy',
      features: [
        '2 panels per day',
        '2 deal trials per day',
        'AI investor personas',
        'Basic deal generation',
      ],
      cta: 'Continue Free',
      action: handleFreePlan,
      variant: 'outline' as const,
      current: currentPlan === 'free',
    },
    {
      name: 'Plus',
      price: '$19',
      period: '/month',
      description: 'For active founders',
      features: [
        'Unlimited panels',
        'Unlimited deal trials',
        'Priority AI responses',
        'Deal history & export',
      ],
      cta: 'Choose Plus',
      action: () => handleSubscribe('plus'),
      variant: 'default' as const,
      current: currentPlan === 'plus',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For serious fundraising',
      features: [
        'Everything in Plus',
        'Custom investor personas',
        'Advanced analytics',
        'Priority support',
      ],
      cta: 'Choose Pro',
      action: () => handleSubscribe('pro'),
      variant: 'default' as const,
      popular: true,
      current: currentPlan === 'pro',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <PageHeader />

        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-[var(--neon-primary)]">
              <Waves className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free and upgrade as you grow. All plans include AI investor panels.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative border-border bg-card ${plan.popular ? 'ring-2 ring-primary' : ''} ${plan.current ? 'ring-2 ring-secondary' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl text-card-foreground">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-card-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.variant}
                  className="w-full"
                  onClick={plan.action}
                  disabled={subscribing !== null || plan.current}
                >
                  {subscribing === plan.name.toLowerCase() ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.current ? (
                    'Current Plan'
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8">
          Demo checkout: use card 4242 4242 4242 4242, any expiry, any CVC.
        </p>

        {!user && (
          <p className="text-center text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default PlansPage;
