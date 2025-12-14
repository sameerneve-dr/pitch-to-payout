import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Confetti from '@/components/Confetti';
import { Check, DollarSign, ArrowRight, Sparkles } from 'lucide-react';

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

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('deal_id');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (dealId) {
      fetchDeal();
      updateDealStatus();
    }
  }, [dealId]);

  const fetchDeal = async () => {
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

  const updateDealStatus = async () => {
    try {
      await supabase
        .from('deals')
        .update({ status: 'paid' })
        .eq('id', dealId);
    } catch (error) {
      console.error('Error updating deal status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
            Deal Accepted
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
          {deal && (
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
