import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Loader2, Calendar, DollarSign } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface Pitch {
  id: string;
  created_at: string;
  startup_name: string | null;
  ask_amount: number;
  equity_percent: number;
  stage: string | null;
  panels: {
    id: string;
    deals: {
      id: string;
      status: string;
    }[];
  }[];
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: billingLoading } = useBilling();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (user && isActive) {
      fetchPitches();
    }
  }, [user, isActive]);

  const fetchPitches = async () => {
    try {
      const { data, error } = await supabase
        .from('pitches')
        .select(`
          *,
          panels(
            id,
            deals(id, status)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPitches(data as Pitch[]);
    } catch (error) {
      console.error('Error fetching pitches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (pitch: Pitch) => {
    const latestDeal = pitch.panels?.[0]?.deals?.[0];
    if (!latestDeal) {
      if (pitch.panels?.length > 0) {
        return <Badge variant="secondary">Panel Generated</Badge>;
      }
      return <Badge variant="outline">Draft</Badge>;
    }
    
    switch (latestDeal.status) {
      case 'paid':
        return <Badge className="bg-chart-1 text-foreground">Funded</Badge>;
      case 'accepted':
        return <Badge className="bg-chart-4 text-foreground">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PageHeader backTo="/app" backLabel="Back to Dashboard" />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Pitches</h1>
            <p className="text-muted-foreground">Track your investor panels and deals</p>
          </div>
          <Link to="/new">
            <Button className="shadow-[var(--neon-primary)]">New Pitch</Button>
          </Link>
        </div>

        {pitches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No pitches yet</p>
              <Link to="/new">
                <Button>Create Your First Pitch</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pitches.map((pitch) => (
              <Card key={pitch.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          {pitch.startup_name || 'Unnamed Pitch'}
                        </h3>
                        {getStatusBadge(pitch)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(pitch.ask_amount)} for {pitch.equity_percent}%
                        </span>
                        {pitch.stage && (
                          <span>• {pitch.stage}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pitch.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pitch.panels?.[0] ? (
                        <>
                          {pitch.panels[0].deals?.[0] ? (
                            <Link to={`/deal/${pitch.panels[0].deals[0].id}`}>
                              <Button variant="outline" size="sm">
                                View Deal
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/panel/${pitch.panels[0].id}`}>
                              <Button variant="outline" size="sm">
                                View Panel
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
