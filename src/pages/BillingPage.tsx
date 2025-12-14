import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, CreditCard, Check, Zap } from 'lucide-react';

const BillingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { isActive, plan, loading: billingLoading, refetch } = useBilling();
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleUpgrade = async () => {
    if (!session) return;
    
    setUpgrading(true);
    try {
      const response = await supabase.functions.invoke('create-flowglad-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start upgrade',
        variant: 'destructive',
      });
      setUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || billingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
        <p className="text-muted-foreground mb-8">Manage your subscription and billing</p>

        {/* Current Plan */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your active subscription</CardDescription>
              </div>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-sm">
                {plan === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isActive ? (
              <div className="flex items-center gap-2 text-primary">
                <Check className="w-5 h-5" />
                <span>Active subscription</span>
              </div>
            ) : (
              <p className="text-muted-foreground">
                You're on the free plan. Upgrade to unlock premium features.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Card */}
        {!isActive && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Get unlimited panels and priority AI generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  Unlimited investor panels
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  Priority AI processing
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  Advanced analytics
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  Export deal documents
                </li>
              </ul>
              <Button onClick={handleUpgrade} disabled={upgrading} className="w-full">
                {upgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingPage;
