import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Loader2, 
  DollarSign,
  Users,
  TrendingUp,
  Check,
  X,
  Sparkles,
  Zap
} from 'lucide-react';

interface Allocation {
  investor: string;
  role: string;
  amount: number;
  percentageOfDeal: number;
  equityShare: number;
  reason: string;
}

interface DealTerms {
  askAmount: number;
  equityPercent: number;
  totalOffered: number;
  postMoneyValuation: number;
  allocations: Allocation[];
  fundingStatus: string;
  shortfall: number;
}

interface Deal {
  id: string;
  panel_id: string;
  status: string;
  deal_terms: DealTerms;
  checkout_url: string | null;
  panel: {
    pitch: {
      startup_name: string | null;
      user_id: string;
    };
  };
}

const DealPage = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (dealId && user) {
      fetchDeal();
    }
  }, [dealId, user]);

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          panel:panels(
            pitch:pitches(startup_name, user_id)
          )
        `)
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data as unknown as Deal);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDeal = async () => {
    if (!session) return;
    
    setProcessing(true);
    try {
      const response = await supabase.functions.invoke('create-deal-checkout', {
        body: { dealId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Redirect to Flowglad checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create checkout',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  const handleDeclineDeal = async () => {
    try {
      await supabase
        .from('deals')
        .update({ status: 'declined' })
        .eq('id', dealId);

      toast({
        title: 'Deal Declined',
        description: 'You can start a new pitch anytime.',
      });

      navigate('/new');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline deal',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  const terms = deal.deal_terms;
  const fundedPercentage = (terms.totalOffered / terms.askAmount) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to={`/panel/${deal.panel_id}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Panel
        </Link>

        {/* Demo Badge */}
        <div className="flex justify-center mb-6">
          <Badge variant="outline" className="bg-accent/50 text-accent-foreground px-4 py-1">
            <Sparkles className="w-3 h-3 mr-2" />
            Demo Mode - Test Payments
          </Badge>
        </div>

        {/* Main Deal Card */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-accent/10 mb-8">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold">
              {deal.panel.pitch.startup_name || 'Your Startup'} Deal
            </CardTitle>
            <CardDescription className="text-lg">
              AI-Generated Investment Terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-background rounded-xl">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(terms.askAmount)}
                </p>
                <p className="text-sm text-muted-foreground">Total Ask</p>
              </div>
              <div className="text-center p-6 bg-background rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {terms.equityPercent}%
                </p>
                <p className="text-sm text-muted-foreground">Equity</p>
              </div>
              <div className="text-center p-6 bg-background rounded-xl">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(terms.postMoneyValuation)}
                </p>
                <p className="text-sm text-muted-foreground">Post-Money</p>
              </div>
            </div>

            {/* Funding Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Funding Progress</span>
                <span className="font-medium">
                  {formatCurrency(terms.totalOffered)} / {formatCurrency(terms.askAmount)}
                </span>
              </div>
              <Progress value={Math.min(fundedPercentage, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fundedPercentage.toFixed(0)}% funded</span>
                <Badge variant={terms.fundingStatus === 'fully_funded' ? 'default' : 'secondary'}>
                  {terms.fundingStatus === 'fully_funded' ? 'Fully Funded' : 'Partially Funded'}
                </Badge>
              </div>
            </div>

            {/* Allocations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Investor Allocations</h3>
              <div className="space-y-3">
                {terms.allocations.map((alloc, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {alloc.investor.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{alloc.investor}</p>
                        <p className="text-sm text-muted-foreground">{alloc.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(alloc.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {alloc.equityShare.toFixed(2)}% equity
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valuation Formula */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Post-Money Valuation Formula</p>
              <p className="font-mono text-sm">
                {formatCurrency(terms.askAmount)} ÷ {terms.equityPercent}% = {formatCurrency(terms.postMoneyValuation)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              One click can move {formatCurrency(terms.askAmount)}+ (test mode). 
              This replaces weeks of fundraising meetings with one execution flow.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDeclineDeal}
                disabled={processing}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button 
                className="flex-1"
                onClick={handleAcceptDeal}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Accept Investment
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DealPage;
