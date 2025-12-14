import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shuffle, Users, Rocket, Sparkles } from 'lucide-react';

interface Startup {
  id: string;
  startup_name: string;
  stage: string;
  ask_amount: number;
  equity_percent: number;
  arr: number | null;
  pitch_text: string;
}

interface Investor {
  id: string;
  name: string;
  job_title: string | null;
  investor_type: string | null;
  risk_tolerance: string | null;
  investment_thesis: string | null;
}

export default function DemoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [startup, setStartup] = useState<Startup | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [investorTypes, setInvestorTypes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [counts, setCounts] = useState({ startups: 0, investors: 0 });

  useEffect(() => {
    fetchCounts();
    fetchInvestorTypes();
  }, []);

  const fetchCounts = async () => {
    const [startupsRes, investorsRes] = await Promise.all([
      supabase.from('startup_pitches').select('id', { count: 'exact', head: true }),
      supabase.from('investors').select('id', { count: 'exact', head: true })
    ]);
    setCounts({
      startups: startupsRes.count || 0,
      investors: investorsRes.count || 0
    });
  };

  const fetchInvestorTypes = async () => {
    const { data } = await supabase.from('investors').select('investor_type');
    const types = [...new Set(data?.map(d => d.investor_type).filter(Boolean) as string[])];
    setInvestorTypes(types);
  };

  const pickRandomStartup = async () => {
    const { data, error } = await supabase
      .from('startup_pitches')
      .select('*');
    
    if (error || !data || data.length === 0) {
      toast.error('No startups available. Import some first!');
      return;
    }
    
    const random = data[Math.floor(Math.random() * data.length)];
    setStartup(random);
    toast.success(`Selected: ${random.startup_name}`);
  };

  const generatePanel = async () => {
    let query = supabase.from('investors').select('*');
    
    if (riskFilter !== 'all') {
      query = query.eq('risk_tolerance', riskFilter);
    }
    if (typeFilter !== 'all') {
      query = query.eq('investor_type', typeFilter);
    }
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      toast.error('No investors match your filters. Try different filters!');
      return;
    }
    
    // Pick 3-5 random investors
    const shuffled = data.sort(() => 0.5 - Math.random());
    const count = Math.min(Math.max(3, Math.floor(Math.random() * 3) + 3), shuffled.length);
    setInvestors(shuffled.slice(0, count));
    toast.success(`Selected ${count} investors for the panel`);
  };

  const launchDemo = async () => {
    if (!startup || investors.length === 0) {
      toast.error('Select a startup and generate a panel first');
      return;
    }

    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/auth');
      return;
    }

    setGenerating(true);
    try {
      // Create pitch from demo startup
      const { data: pitch, error: pitchError } = await supabase
        .from('pitches')
        .insert({
          user_id: user.id,
          raw_pitch_text: startup.pitch_text,
          startup_name: startup.startup_name,
          stage: startup.stage as any,
          arr: startup.arr,
          ask_amount: startup.ask_amount,
          equity_percent: startup.equity_percent
        })
        .select()
        .single();

      if (pitchError) throw pitchError;

      // Generate panel using selected investors
      const { data: panelData, error: panelError } = await supabase.functions.invoke('generate-panel', {
        body: {
          pitchId: pitch.id,
          rawPitch: startup.pitch_text,
          askAmount: startup.ask_amount,
          equityPercent: startup.equity_percent,
          startupName: startup.startup_name,
          stage: startup.stage,
          arr: startup.arr,
          demoInvestors: investors.map(inv => ({
            name: inv.name,
            role: inv.job_title || inv.investor_type || 'Investor',
            thesis: inv.investment_thesis || 'Looking for promising opportunities',
            riskAppetite: inv.risk_tolerance || 'Medium'
          }))
        }
      });

      if (panelError) throw panelError;

      toast.success('Panel generated! Redirecting...');
      navigate(`/panel/${panelData.panel.id}`);
    } catch (error) {
      console.error('Demo launch error:', error);
      toast.error('Failed to launch demo');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Demo Mode
            </h1>
            <p className="text-muted-foreground">Pick a random startup and generate an investor panel</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/seed')}>Seed Data</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
          </div>
        </div>

        {counts.startups === 0 || counts.investors === 0 ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No data available. <Button variant="link" onClick={() => navigate('/seed')}>Import CSVs first</Button>
              </p>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            {counts.startups} startups · {counts.investors} investors available
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Startup Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Startup
              </CardTitle>
              <CardDescription>Pick a random startup from the database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={pickRandomStartup} className="w-full" disabled={counts.startups === 0}>
                <Shuffle className="mr-2 h-4 w-4" />
                Pick Random Startup
              </Button>
              
              {startup && (
                <div className="p-4 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{startup.startup_name}</h3>
                    <Badge variant="secondary">{startup.stage}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{startup.pitch_text}</p>
                  <div className="flex gap-4 text-sm">
                    <span>Ask: ${startup.ask_amount.toLocaleString()}</span>
                    <span>Equity: {startup.equity_percent}%</span>
                    {startup.arr && <span>ARR: ${startup.arr.toLocaleString()}</span>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investor Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Investor Panel
              </CardTitle>
              <CardDescription>Generate 3-5 random investors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Risk Tolerance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Investor Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {investorTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={generatePanel} className="w-full" disabled={counts.investors === 0}>
                <Shuffle className="mr-2 h-4 w-4" />
                Generate Panel
              </Button>
              
              {investors.length > 0 && (
                <div className="space-y-2">
                  {investors.map(inv => (
                    <div key={inv.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inv.name}</p>
                        <p className="text-xs text-muted-foreground">{inv.job_title || inv.investor_type}</p>
                      </div>
                      {inv.risk_tolerance && (
                        <Badge variant={inv.risk_tolerance === 'High' ? 'destructive' : inv.risk_tolerance === 'Low' ? 'secondary' : 'default'}>
                          {inv.risk_tolerance}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Button 
          onClick={launchDemo}
          disabled={!startup || investors.length === 0 || generating}
          className="w-full"
          size="lg"
        >
          {generating ? 'Generating...' : 'Launch Demo with AI Panel'}
        </Button>
      </div>
    </div>
  );
}
