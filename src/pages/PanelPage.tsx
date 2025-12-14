import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  Loader2, 
  User, 
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface Persona {
  name: string;
  role: string;
  thesis: string;
  riskAppetite: string;
  questions: string[];
  riskNote: string;
  offerAmount: number;
  offerReason: string;
}

interface Panel {
  id: string;
  pitch_id: string;
  personas: Persona[];
  questions: any[];
  offers: any[];
  pitch: {
    startup_name: string | null;
    ask_amount: number;
    equity_percent: number;
    raw_pitch_text: string;
    stage: string | null;
    arr: number | null;
  };
}

const PanelPage = () => {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();

  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingDeal, setGeneratingDeal] = useState(false);

  // No auth redirect - useAuth handles anonymous sign-in automatically

  useEffect(() => {
    if (panelId && user) {
      fetchPanel();
    }
  }, [panelId, user]);

  const fetchPanel = async () => {
    try {
      const { data, error } = await supabase
        .from('panels')
        .select(`
          *,
          pitch:pitches(*)
        `)
        .eq('id', panelId)
        .single();

      if (error) throw error;
      setPanel(data as unknown as Panel);
    } catch (error) {
      console.error('Error fetching panel:', error);
      toast({
        title: 'Error',
        description: 'Failed to load panel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDeal = async () => {
    if (!session) return;
    
    setGeneratingDeal(true);
    try {
      const response = await supabase.functions.invoke('generate-deal', {
        body: { panelId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Deal Generated!',
        description: 'Your deal terms are ready.',
      });

      navigate(`/deal/${response.data.deal.id}`);
    } catch (error) {
      console.error('Error generating deal:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate deal',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDeal(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-chart-1/20 text-chart-1';
      case 'medium': return 'bg-chart-4/20 text-chart-4';
      case 'high': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Panel not found</p>
      </div>
    );
  }

  const personas = panel.personas as Persona[];
  const totalOffered = personas.reduce((sum, p) => sum + p.offerAmount, 0);
  const isFullyFunded = totalOffered >= panel.pitch.ask_amount;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PageHeader backTo="/new" backLabel="New Pitch" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {panel.pitch.startup_name || 'Your Pitch'} - Investor Panel
          </h1>
          <p className="text-muted-foreground">
            Asking ${panel.pitch.ask_amount.toLocaleString()} for {panel.pitch.equity_percent}% equity
          </p>
        </div>

        {/* Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Offered</p>
                <p className="text-3xl font-bold text-foreground">
                  ${totalOffered.toLocaleString()}
                </p>
              </div>
              <Badge variant={isFullyFunded ? 'default' : 'secondary'} className="text-sm px-4 py-1">
                {isFullyFunded ? 'Fully Funded' : 'Partially Funded'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Personas */}
        <div className="space-y-6 mb-8">
          {personas.map((persona, index) => (
            <Card key={index} className={persona.offerAmount > 0 ? 'border-primary/30' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{persona.name}</CardTitle>
                      <CardDescription>{persona.role}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getRiskColor(persona.riskAppetite)}>
                    {persona.riskAppetite} Risk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Thesis */}
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-1 text-primary" />
                  <p className="text-sm text-muted-foreground">{persona.thesis}</p>
                </div>

                {/* Questions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageCircle className="w-4 h-4" />
                    Questions
                  </div>
                  <ul className="space-y-1 pl-6">
                    {persona.questions.map((q, qIndex) => (
                      <li key={qIndex} className="text-sm text-muted-foreground list-disc">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Note */}
                <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{persona.riskNote}</p>
                </div>

                {/* Offer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">
                      {persona.offerAmount > 0 
                        ? `$${persona.offerAmount.toLocaleString()}` 
                        : 'Pass'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs text-right">
                    {persona.offerReason}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Generate Deal CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  Ready to see your deal?
                </h3>
                <p className="text-muted-foreground">
                  AI will generate allocations, equity splits, and valuation.
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={handleGenerateDeal}
                disabled={generatingDeal}
              >
                {generatingDeal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Deal UI
                    <ArrowRight className="w-4 h-4 ml-2" />
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

export default PanelPage;
