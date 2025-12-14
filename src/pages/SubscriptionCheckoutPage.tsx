import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Loader2, 
  CreditCard, 
  Check, 
  Shield,
  Waves,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const PLANS = {
  plus: {
    name: 'Plus',
    price: '$29',
    period: '/month',
    features: ['5 pitches/day', '3 panels/day', '2 deals/day', 'Priority support'],
  },
  pro: {
    name: 'Pro',
    price: '$79',
    period: '/month',
    features: ['Unlimited pitches', 'Unlimited panels', 'Unlimited deals', 'Priority support', 'Custom branding'],
  },
};

const SubscriptionCheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const plan = searchParams.get('plan') as 'plus' | 'pro' || 'plus';
  const planDetails = PLANS[plan] || PLANS.plus;

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setProcessing(true);

    // Create Flowglad checkout in background (for reference only, don't block on it)
    supabase.functions.invoke('create-subscription-checkout', {
      body: { plan },
    }).then(({ data }) => {
      console.log('Flowglad checkout created (background):', data?.url);
    }).catch((err) => {
      console.log('Flowglad checkout background error (ignored):', err);
    });

    // Simulate brief processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Update profile with subscription
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          plan: plan,
          plan_status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSuccess(true);
      toast.success('Payment successful! ✅');

      // Redirect to dashboard after showing success
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to SharkBank {planDetails.name}. Redirecting to dashboard...
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <PageHeader backTo="/plans" backLabel="Back to Plans" />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">SharkBank</span>
              </div>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Subscribe to {planDetails.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-border">
                <div>
                  <p className="font-semibold">{planDetails.name} Plan</p>
                  <p className="text-sm text-muted-foreground">Monthly subscription</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{planDetails.price}</p>
                  <p className="text-sm text-muted-foreground">{planDetails.period}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Includes:</p>
                {planDetails.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-semibold">Total today</span>
                <span className="text-xl font-bold text-primary">{planDetails.price}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Enter your card information below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-muted rounded-lg border border-border mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <strong>Demo checkout</strong> – no real payment processed. Enter any card details.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Cardholder Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay {planDetails.price}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Demo mode • No real charges</span>
                </div>
              </form>

              {/* Demo skip button */}
              <div className="mt-6 pt-6 border-t border-dashed border-muted text-center bg-muted/30 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-3 font-medium">
                  Demo Mode Only
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    toast.success('Demo payment successful!');
                    navigate('/app');
                  }}
                  className="text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                >
                  Skip Payment → Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckoutPage;
