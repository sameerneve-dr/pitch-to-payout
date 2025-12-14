import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Save,
  Handshake,
  Calculator
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
  const [saving, setSaving] = useState(false);
  const [currentTerms, setCurrentTerms] = useState<TermSheetTerms | null>(null);
  const [currentAllocations, setCurrentAllocations] = useState<InvestorAllocation[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDollarRain, setShowDollarRain] = useState(false);
  const [activeTab, setActiveTab] = useState('negotiate');

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

  const handleTermsChange = (terms: TermSheetTerms) => {
    setCurrentTerms(terms);
    setHasChanges(true);
  };

  const handleAllocationsChange = (allocations: InvestorAllocation[]) => {
    setCurrentAllocations(allocations);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!deal) return;
    
    setSaving(true);
    try {
      // Calculate new totals from included allocations
      const includedAllocations = currentAllocations.length > 0 
        ? currentAllocations.filter(a => a.isIncluded)
        : terms.allocations.filter(a => a.isIncluded !== false);
      
      const newTotalOffered = includedAllocations.reduce((sum, a) => sum + a.amount, 0);
      
      const updatedDealTerms = {
        ...deal.deal_terms,
        allocations: currentAllocations.length > 0 ? currentAllocations : deal.deal_terms.allocations,
        totalOffered: newTotalOffered,
        fundingStatus: newTotalOffered >= deal.deal_terms.askAmount ? 'fully_funded' : 'partially_funded',
        shortfall: newTotalOffered < deal.deal_terms.askAmount ? deal.deal_terms.askAmount - newTotalOffered : 0,
        ...(currentTerms && { termSheet: currentTerms }),
      };

      const { error } = await supabase
        .from('deals')
        .update({ deal_terms: updatedDealTerms as any })
        .eq('id', dealId);

      if (error) throw error;

      setDeal({ ...deal, deal_terms: updatedDealTerms });
      setHasChanges(false);
      
      toast({
        title: 'Changes Saved',
        description: 'Your deal terms have been updated.',
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptDeal = async () => {
    if (!session) return;
    
    // Save changes first if there are any
    if (hasChanges) {
      await handleSaveChanges();
    }
    
    // Start the dollar rain animation
    setShowDollarRain(true);
    
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

      // Keep the animation running for a moment before redirect
      setTimeout(() => {
        window.location.href = response.data.url;
      }, 1500);
    } catch (error) {
      console.error('Error creating checkout:', error);
      setShowDollarRain(false);
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Deal Summary */}
          <div className="space-y-6">
            {/* Main Deal Card */}
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">
                  {deal.panel.pitch.startup_name || 'Your Startup'} Deal
                </CardTitle>
                <CardDescription>
                  AI-Generated Investment Terms
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
                      {formatCurrency(terms.totalOffered)} / {formatCurrency(terms.askAmount)}
                    </span>
                  </div>
                  <Progress value={Math.min(fundedPercentage, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fundedPercentage.toFixed(0)}% funded</span>
                    <Badge variant={terms.fundingStatus === 'fully_funded' ? 'default' : 'secondary'} className="text-xs">
                      {terms.fundingStatus === 'fully_funded' ? 'Fully Funded' : 'Partially Funded'}
                    </Badge>
                  </div>
                </div>

                {/* Allocations */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Investor Allocations</h3>
                  <div className="space-y-2">
                    {terms.allocations.filter(a => a.isIncluded !== false).map((alloc, index) => (
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
                            <p className="font-medium text-sm">{alloc.investor}</p>
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
                <p className="text-center text-muted-foreground text-sm mb-4">
                  One click can move {formatCurrency(terms.askAmount)}+ (test mode).
                </p>
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
                        Accept Investment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Negotiation & Term Sheet */}
          <div className="space-y-4">
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
            
            {hasChanges && (
              <Button 
                onClick={handleSaveChanges} 
                disabled={saving}
                className="w-full"
                variant="outline"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealPage;
