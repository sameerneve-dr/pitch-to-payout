import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  Target
} from 'lucide-react';

interface TermSheetProps {
  initialInvestment: number;
  initialEquity: number;
  askAmount: number;
  onTermsChange?: (terms: TermSheetTerms) => void;
}

export interface TermSheetTerms {
  investmentAmount: number;
  equityPercent: number;
  exitMode: 'valuation' | 'multiple';
  exitValuation: number;
  exitMultiple: number;
  postMoney: number;
  preMoney: number;
  askCoverage: number;
  investorPayout: number;
  profitLoss: number;
  roiMultiple: number;
}

const TermSheet = ({ initialInvestment, initialEquity, askAmount, onTermsChange }: TermSheetProps) => {
  const [investmentAmount, setInvestmentAmount] = useState(initialInvestment);
  const [equityPercent, setEquityPercent] = useState(initialEquity);
  const [exitMode, setExitMode] = useState<'valuation' | 'multiple'>('multiple');
  const [exitValuation, setExitValuation] = useState(initialInvestment * 10);
  const [exitMultiple, setExitMultiple] = useState(10);

  // Derived calculations
  const postMoney = equityPercent > 0 ? investmentAmount / (equityPercent / 100) : 0;
  const preMoney = postMoney - investmentAmount;
  const askCoverage = askAmount > 0 ? (investmentAmount / askAmount) * 100 : 0;
  
  // Calculate effective exit valuation based on mode
  const effectiveExitValuation = exitMode === 'valuation' 
    ? exitValuation 
    : postMoney * exitMultiple;
  
  const investorPayout = effectiveExitValuation * (equityPercent / 100);
  const profitLoss = investorPayout - investmentAmount;
  const roiMultiple = investmentAmount > 0 ? investorPayout / investmentAmount : 0;

  // Notify parent of changes
  useEffect(() => {
    if (onTermsChange) {
      onTermsChange({
        investmentAmount,
        equityPercent,
        exitMode,
        exitValuation: effectiveExitValuation,
        exitMultiple,
        postMoney,
        preMoney,
        askCoverage,
        investorPayout,
        profitLoss,
        roiMultiple,
      });
    }
  }, [investmentAmount, equityPercent, exitMode, exitValuation, exitMultiple, effectiveExitValuation]);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Term Sheet
          </CardTitle>
          <Badge variant="outline">Interactive</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Investment Amount */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Investment Amount
            </Label>
            <span className="font-mono font-semibold">{formatCurrency(investmentAmount)}</span>
          </div>
          <div className="flex gap-4 items-center">
            <Slider
              value={[investmentAmount]}
              onValueChange={([v]) => setInvestmentAmount(v)}
              min={10000}
              max={Math.max(askAmount * 2, 1000000)}
              step={10000}
              className="flex-1"
            />
            <Input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value) || 0)}
              className="w-32 font-mono"
            />
          </div>
        </div>

        {/* Equity Percent */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Equity
            </Label>
            <span className="font-mono font-semibold">{equityPercent.toFixed(1)}%</span>
          </div>
          <div className="flex gap-4 items-center">
            <Slider
              value={[equityPercent]}
              onValueChange={([v]) => setEquityPercent(v)}
              min={0.5}
              max={50}
              step={0.5}
              className="flex-1"
            />
            <Input
              type="number"
              value={equityPercent}
              onChange={(e) => setEquityPercent(Number(e.target.value) || 0)}
              className="w-32 font-mono"
              step={0.5}
            />
          </div>
        </div>

        {/* Exit Scenario */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Exit Scenario
            </Label>
            <Select value={exitMode} onValueChange={(v: 'valuation' | 'multiple') => setExitMode(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple">Exit Multiple</SelectItem>
                <SelectItem value="valuation">Exit Valuation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {exitMode === 'multiple' ? (
            <div className="flex gap-4 items-center">
              <Slider
                value={[exitMultiple]}
                onValueChange={([v]) => setExitMultiple(v)}
                min={1}
                max={100}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1 w-32">
                <Input
                  type="number"
                  value={exitMultiple}
                  onChange={(e) => setExitMultiple(Number(e.target.value) || 1)}
                  className="font-mono"
                />
                <span className="text-muted-foreground">x</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <Slider
                value={[exitValuation]}
                onValueChange={([v]) => setExitValuation(v)}
                min={postMoney}
                max={postMoney * 100}
                step={1000000}
                className="flex-1"
              />
              <Input
                type="number"
                value={exitValuation}
                onChange={(e) => setExitValuation(Number(e.target.value) || 0)}
                className="w-32 font-mono"
              />
            </div>
          )}
        </div>

        {/* Live Calculations */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Post-money Valuation</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(postMoney)}</p>
            <p className="text-xs text-muted-foreground">I ÷ E%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Pre-money Valuation</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(preMoney)}</p>
            <p className="text-xs text-muted-foreground">Post - I</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Ask Coverage</p>
            <p className="text-lg font-bold font-mono">{askCoverage.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">of {formatCurrency(askAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Exit Valuation</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(effectiveExitValuation)}</p>
            <p className="text-xs text-muted-foreground">{exitMode === 'multiple' ? `${exitMultiple}x` : 'Fixed'}</p>
          </div>
        </div>

        {/* Investor Returns */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-sm">Investor Returns at Exit</h4>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Investor Payout</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(investorPayout)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Profit / Loss</span>
            <span className={`font-mono font-bold text-lg flex items-center gap-1 ${profitLoss >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
              {profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
            </span>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">ROI Multiple</span>
            <Badge 
              variant={roiMultiple >= 1 ? 'default' : 'destructive'}
              className="text-lg px-3 py-1 font-mono"
            >
              {roiMultiple.toFixed(1)}x
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Drag sliders or edit fields to model different scenarios
        </p>
      </CardContent>
    </Card>
  );
};

export default TermSheet;
