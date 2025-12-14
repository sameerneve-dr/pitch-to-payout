import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Trash2, Database } from 'lucide-react';

export default function SeedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [startupsCsv, setStartupsCsv] = useState('');
  const [investorsCsv, setInvestorsCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [counts, setCounts] = useState<{ startups: number; investors: number } | null>(null);

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

  useState(() => {
    fetchCounts();
  });

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) {
    navigate('/auth');
    return null;
  }

  const parseCsv = (csv: string): Record<string, string>[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const importStartups = async () => {
    const rows = parseCsv(startupsCsv);
    if (rows.length === 0) {
      toast.error('No valid startup data found');
      return;
    }

    const mapped = rows.map(r => ({
      startup_id: r.startup_id || r.id || null,
      startup_name: r.startup_name || r.name || 'Unknown',
      stage: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'].includes(r.stage) 
        ? r.stage 
        : 'Seed',
      ask_amount: parseFloat(r.ask_amount || r.ask || '100000') || 100000,
      equity_percent: parseFloat(r.equity_percent || r.equity || '10') || 10,
      arr: r.arr ? parseFloat(r.arr) : null,
      mrr: r.mrr ? parseFloat(r.mrr) : null,
      pitch_text: r.pitch_text || r.pitch || r.description || 'No pitch provided'
    }));

    const { error } = await supabase.from('startup_pitches').insert(mapped);
    if (error) {
      toast.error('Failed to import startups: ' + error.message);
    } else {
      toast.success(`Imported ${mapped.length} startups`);
      setStartupsCsv('');
      fetchCounts();
    }
  };

  const importInvestors = async () => {
    const rows = parseCsv(investorsCsv);
    if (rows.length === 0) {
      toast.error('No valid investor data found');
      return;
    }

    const mapped = rows.map(r => ({
      investor_id: r.investor_id || r.id || null,
      name: r.name || 'Unknown Investor',
      job_title: r.job_title || r.title || null,
      investor_type: r.investor_type || r.type || null,
      companies_invested: r.companies_invested || r.companies || null,
      risk_tolerance: ['Low', 'Medium', 'High'].includes(r.risk_tolerance) 
        ? r.risk_tolerance 
        : null,
      investment_thesis: r.investment_thesis || r.thesis || null
    }));

    const { error } = await supabase.from('investors').insert(mapped);
    if (error) {
      toast.error('Failed to import investors: ' + error.message);
    } else {
      toast.success(`Imported ${mapped.length} investors`);
      setInvestorsCsv('');
      fetchCounts();
    }
  };

  const clearTable = async (table: 'startup_pitches' | 'investors') => {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error('Failed to clear table: ' + error.message);
    } else {
      toast.success(`Cleared ${table}`);
      fetchCounts();
    }
  };

  const handleImport = async () => {
    setImporting(true);
    if (startupsCsv) await importStartups();
    if (investorsCsv) await importInvestors();
    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seed Data</h1>
            <p className="text-muted-foreground">Import CSV data for startups and investors</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
        </div>

        {counts && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Current Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{counts.startups}</span>
                <span className="text-muted-foreground">Startups</span>
                <Button variant="ghost" size="sm" onClick={() => clearTable('startup_pitches')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{counts.investors}</span>
                <span className="text-muted-foreground">Investors</span>
                <Button variant="ghost" size="sm" onClick={() => clearTable('investors')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Startups CSV</CardTitle>
              <CardDescription>
                Columns: startup_id, startup_name, stage, ask_amount, equity_percent, arr, mrr, pitch_text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste CSV data here..."
                value={startupsCsv}
                onChange={(e) => setStartupsCsv(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Investors CSV</CardTitle>
              <CardDescription>
                Columns: investor_id, name, job_title, investor_type, companies_invested, risk_tolerance, investment_thesis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste CSV data here..."
                value={investorsCsv}
                onChange={(e) => setInvestorsCsv(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        <Button 
          onClick={handleImport} 
          disabled={importing || (!startupsCsv && !investorsCsv)}
          className="w-full"
          size="lg"
        >
          <Upload className="mr-2 h-4 w-4" />
          {importing ? 'Importing...' : 'Import Data'}
        </Button>
      </div>
    </div>
  );
}
