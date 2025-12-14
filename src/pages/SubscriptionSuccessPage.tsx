import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Confetti from '@/components/Confetti';

const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'plus';
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [showConfetti, setShowConfetti] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    activatePlan();
  }, [plan, navigate]);

  const activatePlan = async () => {
    try {
      setStatus('verifying');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to continue');
        navigate('/login');
        return;
      }

      // Update user's plan
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id,
          plan: plan as 'plus' | 'pro',
          plan_status: 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error activating plan:', error);
        throw new Error('Failed to activate plan');
      }
      
      setShowConfetti(true);
      setStatus('success');
      toast.success(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`);
      
      // Seed demo data for the user
      await seedDemoData(user.id);
      
    } catch (err) {
      console.error('Error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to activate subscription');
    }
  };

  const seedDemoData = async (userId: string) => {
    // Check if user already has pitches
    const { data: existingPitches } = await supabase
      .from('pitches')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingPitches && existingPitches.length > 0) {
      return; // User already has data
    }

    // Insert demo pitches
    const demoPitches = [
      {
        user_id: userId,
        startup_name: 'EcoTrack',
        raw_pitch_text: 'EcoTrack is a B2B SaaS platform helping enterprises track and reduce their carbon footprint. We have 15 paying customers with $45K MRR and growing 20% month over month.',
        stage: 'Seed' as const,
        mrr: 45000,
        arr: 540000,
        ask_amount: 500000,
        equity_percent: 8
      },
      {
        user_id: userId,
        startup_name: 'HealthPulse AI',
        raw_pitch_text: 'HealthPulse AI uses machine learning to predict patient readmission risks. We are in 3 hospital pilots with a $200K contract pipeline.',
        stage: 'Pre-Seed' as const,
        mrr: 12000,
        arr: 144000,
        ask_amount: 250000,
        equity_percent: 12
      },
      {
        user_id: userId,
        startup_name: 'FinFlow',
        raw_pitch_text: 'FinFlow automates invoice reconciliation for SMBs. We have 50 active users and $8K MRR with a 95% retention rate.',
        stage: 'Pre-Seed' as const,
        mrr: 8000,
        arr: 96000,
        ask_amount: 150000,
        equity_percent: 15
      }
    ];

    const { error } = await supabase.from('pitches').insert(demoPitches);
    
    if (error) {
      console.error('Error seeding demo pitches:', error);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
            <CardDescription>
              Please wait while we confirm your subscription.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Activation Failed</CardTitle>
            <CardDescription className="text-destructive">
              {errorMessage || 'We could not activate your subscription. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={activatePlan} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/plans')} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {showConfetti && <Confetti active={showConfetti} />}
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Payment Verified ✅
          </CardTitle>
          <CardDescription>
            Welcome to {plan.charAt(0).toUpperCase() + plan.slice(1)}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We've added 3 demo pitches to get you started. 
            Try generating your first investor panel!
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/new')} className="w-full">
              Create New Pitch
            </Button>
            <Button variant="outline" onClick={() => navigate('/history')} className="w-full">
              View Demo Pitches
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccessPage;
