import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const SAMPLE_PITCH = "I'm building an AI invoicing tool that automatically extracts invoice data, handles approvals, and syncs with accounting software. We have $50k ARR with 47 paying customers, growing 15% MoM. Asking $100,000 for 10% equity.";

const NewPitchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();
  const { isActive, loading: billingLoading } = useBilling();

  const [rawPitch, setRawPitch] = useState('');
  const [startupName, setStartupName] = useState('');
  const [stage, setStage] = useState<string>('');
  const [arr, setArr] = useState('');
  const [askAmount, setAskAmount] = useState('');
  const [equityPercent, setEquityPercent] = useState('');
  const [generating, setGenerating] = useState(false);

  // Redirect if not authenticated or not subscribed
  useEffect(() => {
    if (authLoading || billingLoading) return;

    if (!user || user.is_anonymous) {
      navigate('/login');
      return;
    }

    if (!isActive) {
      navigate('/pricing');
    }
  }, [user, authLoading, isActive, billingLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('sample') === 'true') {
      setRawPitch(SAMPLE_PITCH);
      setStartupName('InvoiceAI');
      setStage('Pre-Seed');
      setArr('50000');
      setAskAmount('100000');
      setEquityPercent('10');
    }
  }, [searchParams]);

  const handleGeneratePanel = async () => {
    if (!rawPitch.trim()) {
      toast({
        title: 'Pitch required',
        description: 'Please enter your pitch before generating a panel.',
        variant: 'destructive',
      });
      return;
    }

    if (!askAmount || !equityPercent) {
      toast({
        title: 'Missing information',
        description: 'Please enter the ask amount and equity percentage.',
        variant: 'destructive',
      });
      return;
    }

    if (!session) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to continue.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      // Create pitch in database
      const pitchData: any = {
        user_id: user!.id,
        raw_pitch_text: rawPitch,
        startup_name: startupName || null,
        stage: stage || null,
        arr: arr ? parseFloat(arr) : null,
        ask_amount: parseFloat(askAmount),
        equity_percent: parseFloat(equityPercent),
      };
      
      const { data: pitch, error: pitchError } = await supabase
        .from('pitches')
        .insert(pitchData)
        .select()
        .single();

      if (pitchError) {
        throw new Error('Failed to save pitch');
      }

      // Generate panel via edge function
      const response = await supabase.functions.invoke('generate-panel', {
        body: {
          pitchId: pitch.id,
          rawPitch,
          askAmount: parseFloat(askAmount),
          equityPercent: parseFloat(equityPercent),
          startupName,
          stage,
          arr: arr ? parseFloat(arr) : null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Panel Generated!',
        description: 'Your investor panel is ready.',
      });

      navigate(`/panel/${response.data.panel.id}`);
    } catch (error) {
      console.error('Error generating panel:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || billingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isActive) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Pitch</CardTitle>
            <CardDescription>
              Enter your startup pitch and let AI investors evaluate your opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sample hint */}
            <div className="bg-accent/50 rounded-lg p-4 text-sm">
              <p className="font-medium text-accent-foreground mb-1">Try this:</p>
              <p className="text-muted-foreground italic">
                "I'm building an AI invoicing tool. $50k ARR. Asking $100k for 10%."
              </p>
            </div>

            {/* Main pitch textarea */}
            <div className="space-y-2">
              <Label htmlFor="pitch">Your Pitch</Label>
              <Textarea
                id="pitch"
                placeholder="Tell us about your startup... What problem do you solve? What traction do you have? How much are you raising?"
                value={rawPitch}
                onChange={(e) => setRawPitch(e.target.value)}
                className="min-h-32"
              />
            </div>

            {/* Structured fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startupName">Startup Name (optional)</Label>
                <Input
                  id="startupName"
                  placeholder="e.g., InvoiceAI"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Seed">Pre-Seed</SelectItem>
                    <SelectItem value="Seed">Seed</SelectItem>
                    <SelectItem value="Series A">Series A</SelectItem>
                    <SelectItem value="Series B">Series B</SelectItem>
                    <SelectItem value="Series C">Series C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arr">Annual Recurring Revenue (ARR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="arr"
                  type="number"
                  placeholder="50000"
                  value={arr}
                  onChange={(e) => setArr(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="askAmount">Ask Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="askAmount"
                    type="number"
                    placeholder="100000"
                    value={askAmount}
                    onChange={(e) => setAskAmount(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="equityPercent">Equity Offered *</Label>
                <div className="relative">
                  <Input
                    id="equityPercent"
                    type="number"
                    placeholder="10"
                    value={equityPercent}
                    onChange={(e) => setEquityPercent(e.target.value)}
                    className="pr-7"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGeneratePanel} 
              className="w-full" 
              size="lg"
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Panel...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Investor Panel
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewPitchPage;
