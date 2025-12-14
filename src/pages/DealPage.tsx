import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TermSheet, { TermSheetTerms } from '@/components/TermSheet';
import InvestorNegotiation, { InvestorAllocation } from '@/components/InvestorNegotiation';
import DollarRain from '@/components/DollarRain';
import { 
  ArrowLeft, 
  Loader2, 
  DollarSign,
  Users,
  TrendingUp,
  Check,
  X,
  Sparkles,
  Zap,
  Send,
  Handshake,
  Calculator,
  MessageSquare,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface DealTerms {
  askAmount: number;
  equityPercent: number;
  totalOffered: number;
  postMoneyValuation: number;
  allocations: InvestorAllocation[];
  fundingStatus: string;
  shortfall: number;
  termSheet?: TermSheetTerms;
  negotiationRound?: 'initial' | 'final';
  finalAllocations?: InvestorAllocation[];
  declinedInvestors?: any[];
  counterOffer?: any;
  totalEquityGiven?: number;
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [currentTerms, setCurrentTerms] = useState<TermSheetTerms | null>(null);
  const [currentAllocations, setCurrentAllocations] = useState<InvestorAllocation[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDollarRain, setShowDollarRain] = useState(false);
  const [activeTab, setActiveTab] = useState('negotiate');

  useEffect(() => {
    if (dealId && user) {
      fetchDeal();
    }
  }, [dealId, user]);

  useEffect(() => {
    if (searchParams.get('status') === 'cancel') {
      toast({
        title: 'Payment cancelled',
        description: 'No charges were made. You can review the deal and try again.',
      });
    }
  }, [searchParams, toast]);

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

  const handleTermsChange = (terms: TermSheetTerms) => {
    setCurrentTerms(terms);
    setHasChanges(true);
  };

  const handleAllocationsChange = (allocations: InvestorAllocation[]) => {
    setCurrentAllocations(allocations);
    setHasChanges(true);
  };

  const handleSubmitCounterOffer = async () => {
    if (!deal || !session) return;
    
    setSubmittingCounter(true);
    try {
      // Build counter-offer from current allocations
      const allocationsToSubmit = currentAllocations.length > 0 
        ? currentAllocations 
        : terms.allocations;

      const counterOffer = {
        allocations: allocationsToSubmit,
        totalOffered: allocationsToSubmit.filter(a => a.isIncluded).reduce((sum, a) => sum + a.amount, 0),
      };

      const response = await supabase.functions.invoke('generate-counter-response', {
        body: { dealId, counterOffer },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Counter-Offer Submitted',
        description: `Investors have responded. ${response.data.declinedCount || 0} declined.`,
      });

      // Refresh deal to get final offers
      await fetchDeal();
      setHasChanges(false);
    } catch (error) {
      console.error('Error submitting counter-offer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit counter-offer',
        variant: 'destructive',
      });
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleAcceptDeal = async () => {
    if (!session || !dealId) return;
    
    setShowDollarRain(true);
    setProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-deal-checkout', {
        body: { dealId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const checkoutUrl = (data as any)?.url || (data as any)?.checkout_url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from payment system.');
      }

      toast({
        title: 'Redirecting to checkout',
        description: 'Demo checkout: use card 4242 4242 4242 4242, any expiry, any CVC.',
      });

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error accepting deal:', error);
      setShowDollarRain(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout. Please try again.',
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

  const handleRenegotiate = async () => {
    if (!deal || !dealId) return;
    
    try {
      // Reset to initial round so user can negotiate again
      const updatedTerms = {
        ...deal.deal_terms,
        negotiationRound: 'initial',
      };
      
      await supabase
        .from('deals')
        .update({ deal_terms: JSON.parse(JSON.stringify(updatedTerms)) })
        .eq('id', dealId);

      toast({
        title: 'Ready to Renegotiate',
        description: 'Adjust your terms and submit a new counter-offer.',
      });

      await fetchDeal();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset negotiation',
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
  const isFinalRound = terms.negotiationRound === 'final';
  const displayAllocations = isFinalRound && terms.finalAllocations 
    ? terms.finalAllocations 
    : terms.allocations.filter(a => a.isIncluded !== false);
  
  const totalOffered = displayAllocations.reduce((sum, a) => sum + a.amount, 0);
  const fundedPercentage = (totalOffered / terms.askAmount) * 100;

  return (
    <div className="min-h-screen bg-background">
      <DollarRain active={showDollarRain} />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
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

        {/* Negotiation Phase Badge */}
        <div className="flex justify-center mb-6">
          <Badge 
            variant={isFinalRound ? "default" : "secondary"} 
            className="px-4 py-2 text-sm"
          >
            {isFinalRound ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Final Offer from Investors
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Initial Offers - Negotiate & Submit Counter
              </>
            )}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Deal Summary */}
          <div className="space-y-6">
            {/* Main Deal Card */}
            <Card className={`border-2 ${isFinalRound ? 'border-primary' : 'border-primary/30'} bg-gradient-to-br from-card to-accent/10`}>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">
                  {deal.panel.pitch.startup_name || 'Your Startup'} Deal
                </CardTitle>
                <CardDescription>
                  {isFinalRound ? 'Final Investment Terms' : 'AI-Generated Investment Terms'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 bg-background rounded-xl">
                    <DollarSign className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(terms.askAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Ask</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-xl">
                    <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold text-foreground">
                      {terms.equityPercent}%
                    </p>
                    <p className="text-xs text-muted-foreground">Equity</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-xl">
                    <TrendingUp className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(terms.postMoneyValuation)}
                    </p>
                    <p className="text-xs text-muted-foreground">Post-Money</p>
                  </div>
                </div>

                {/* Funding Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Funding Progress</span>
                    <span className="font-medium">
                      {formatCurrency(totalOffered)} / {formatCurrency(terms.askAmount)}
                    </span>
                  </div>
                  <Progress value={Math.min(fundedPercentage, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fundedPercentage.toFixed(0)}% funded</span>
                    <Badge variant={fundedPercentage >= 100 ? 'default' : 'secondary'} className="text-xs">
                      {fundedPercentage >= 100 ? 'Fully Funded' : 'Partially Funded'}
                    </Badge>
                  </div>
                </div>

                {/* Declined Investors (only show in final round) */}
                {isFinalRound && terms.declinedInvestors && terms.declinedInvestors.length > 0 && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-2">Declined to Participate:</p>
                    {terms.declinedInvestors.map((inv: any, i: number) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        <span className="font-medium">{inv.investor}</span>: "{inv.response}"
                      </div>
                    ))}
                  </div>
                )}

                {/* Allocations */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    {isFinalRound ? 'Final Investor Terms' : 'Investor Allocations'}
                  </h3>
                  <div className="space-y-2">
                    {displayAllocations.map((alloc, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {alloc.investor.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{alloc.investor}</p>
                              {isFinalRound && (alloc as any).status && (
                                <Badge 
                                  variant={(alloc as any).status === 'accepted' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {(alloc as any).status === 'accepted' ? (
                                    <><ThumbsUp className="w-3 h-3 mr-1" /> Accepted</>
                                  ) : (
                                    'Countered'
                                  )}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{alloc.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(alloc.amount)}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{alloc.equityShare.toFixed(1)}% equity</span>
                            {alloc.royaltyPercent > 0 && (
                              <span className="text-chart-1">+{alloc.royaltyPercent}% royalty</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <Card>
              <CardContent className="pt-6">
                {isFinalRound ? (
                  <>
                    <p className="text-center text-muted-foreground text-sm mb-4">
                      This is the final offer. Accept to proceed to payment, or renegotiate.
                    </p>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3">
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
                              Accept Final Offer
                            </>
                          )}
                        </Button>
                      </div>
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={handleRenegotiate}
                        disabled={processing}
                      >
                        <Handshake className="w-4 h-4 mr-2" />
                        Renegotiate Terms
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Demo checkout: use card 4242 4242 4242 4242, any expiry, any CVC.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-center text-muted-foreground text-sm mb-4">
                      Negotiate terms, then submit your counter-offer for investor response.
                    </p>
                    <Button 
                      className="w-full"
                      onClick={handleSubmitCounterOffer}
                      disabled={submittingCounter}
                    >
                      {submittingCounter ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Investors Reviewing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Counter-Offer
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Negotiation & Term Sheet */}
          <div className="space-y-4">
            {!isFinalRound ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="negotiate" className="flex items-center gap-2">
                    <Handshake className="w-4 h-4" />
                    Negotiate
                  </TabsTrigger>
                  <TabsTrigger value="termsheet" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Term Sheet
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="negotiate" className="mt-4">
                  <InvestorNegotiation
                    allocations={terms.allocations.map(a => ({
                      ...a,
                      royaltyPercent: a.royaltyPercent ?? 0,
                      isIncluded: a.isIncluded !== false
                    }))}
                    askAmount={terms.askAmount}
                    totalEquity={terms.equityPercent}
                    onAllocationsChange={handleAllocationsChange}
                  />
                </TabsContent>
                
                <TabsContent value="termsheet" className="mt-4">
                  <TermSheet
                    initialInvestment={terms.termSheet?.investmentAmount || terms.totalOffered}
                    initialEquity={terms.termSheet?.equityPercent || terms.equityPercent}
                    askAmount={terms.askAmount}
                    onTermsChange={handleTermsChange}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="border-2 border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    Final Investor Responses
                  </CardTitle>
                  <CardDescription>
                    Investors have reviewed your counter-offer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {terms.finalAllocations?.map((alloc, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {alloc.investor.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{alloc.investor}</p>
                            <p className="text-xs text-muted-foreground">{alloc.role}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={(alloc as any).status === 'accepted' ? 'default' : 'secondary'}
                        >
                          {(alloc as any).status === 'accepted' ? 'Accepted' : 'Countered'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground italic mb-3">
                        "{alloc.reason}"
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-background rounded">
                          <p className="font-bold text-sm">{formatCurrency(alloc.amount)}</p>
                          <p className="text-xs text-muted-foreground">Amount</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="font-bold text-sm">{alloc.equityShare.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Equity</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="font-bold text-sm">{alloc.royaltyPercent}%</p>
                          <p className="text-xs text-muted-foreground">Royalty</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealPage;
