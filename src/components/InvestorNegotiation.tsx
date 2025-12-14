import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  DollarSign, 
  Percent, 
  User,
  Handshake,
  TrendingUp
} from 'lucide-react';

export interface InvestorAllocation {
  investor: string;
  role: string;
  amount: number;
  percentageOfDeal: number;
  equityShare: number;
  royaltyPercent: number;
  reason: string;
  isIncluded: boolean;
}

interface InvestorNegotiationProps {
  allocations: InvestorAllocation[];
  askAmount: number;
  totalEquity: number;
  onAllocationsChange: (allocations: InvestorAllocation[]) => void;
}

const InvestorNegotiation = ({ 
  allocations, 
  askAmount, 
  totalEquity,
  onAllocationsChange 
}: InvestorNegotiationProps) => {
  const [localAllocations, setLocalAllocations] = useState<InvestorAllocation[]>(allocations);
  const initialized = useRef(false);

  // Only initialize from props once
  useEffect(() => {
    if (!initialized.current && allocations.length > 0) {
      setLocalAllocations(allocations);
      initialized.current = true;
    }
  }, [allocations]);

  const includedAllocations = localAllocations.filter(a => a.isIncluded);
  const totalInvested = includedAllocations.reduce((sum, a) => sum + a.amount, 0);
  const totalEquityGiven = includedAllocations.reduce((sum, a) => sum + a.equityShare, 0);
  const totalRoyalty = includedAllocations.reduce((sum, a) => sum + a.royaltyPercent, 0);

  const handleToggleInvestor = (index: number, checked: boolean) => {
    const updated = localAllocations.map((alloc, i) => {
      if (i !== index) return alloc;
      return { ...alloc, isIncluded: checked };
    });
    
    setLocalAllocations(updated);
    onAllocationsChange(updated);
  };

  const handleAllocationChange = (index: number, field: keyof InvestorAllocation, value: number) => {
    const updated = localAllocations.map((alloc, i) => {
      if (i !== index) return alloc;
      
      const newAlloc = { ...alloc, [field]: value };
      
      // Recalculate percentage of deal when amount changes
      if (field === 'amount') {
        newAlloc.percentageOfDeal = askAmount > 0 ? (value / askAmount) * 100 : 0;
      }
      
      return newAlloc;
    });
    
    setLocalAllocations(updated);
    onAllocationsChange(updated);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Max amount an investor can offer (2x the ask, or at least $1M)
  const maxInvestment = Math.max(askAmount * 2, 1_000_000);

  return (
    <div className="space-y-4">
      <Card className="border-2 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Handshake className="w-5 h-5 text-primary" />
              Choose Your Investors
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {includedAllocations.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="font-bold text-sm">{formatCurrency(totalInvested)}</p>
              <p className="text-xs text-muted-foreground">ask: {formatCurrency(askAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Equity Given</p>
              <p className="font-bold text-sm">{totalEquityGiven.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">offered: {totalEquity}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Royalty</p>
              <p className="font-bold text-sm">{totalRoyalty.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">on revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {localAllocations.map((alloc, index) => (
        <Card 
          key={index} 
          className={`border transition-all cursor-pointer ${
            alloc.isIncluded 
              ? 'border-primary/50 bg-gradient-to-br from-card to-primary/5' 
              : 'border-border hover:border-muted-foreground/50'
          }`}
        >
          <CardContent className="pt-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  alloc.isIncluded ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <User className={`w-5 h-5 ${alloc.isIncluded ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-semibold">{alloc.investor}</p>
                  <p className="text-xs text-muted-foreground">{alloc.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(alloc.amount)}</p>
                  <p className="text-xs text-muted-foreground">{alloc.equityShare.toFixed(1)}% equity</p>
                </div>
                <Switch
                  checked={alloc.isIncluded}
                  onCheckedChange={(checked) => handleToggleInvestor(index, checked)}
                />
              </div>
            </div>

            {/* Reason - always visible */}
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground italic">"{alloc.reason}"</p>
            </div>

            {alloc.isIncluded && (
              <>
                {/* Investment Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Negotiate Investment
                    </Label>
                    <span className="font-mono text-sm font-semibold">{formatCurrency(alloc.amount)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Slider
                      value={[alloc.amount]}
                      onValueChange={([v]) => handleAllocationChange(index, 'amount', v)}
                      min={10000}
                      max={maxInvestment}
                      step={5000}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={alloc.amount}
                      onChange={(e) => handleAllocationChange(index, 'amount', Number(e.target.value) || 0)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Equity Share */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Equity Share
                    </Label>
                    <span className="font-mono text-sm font-semibold">{alloc.equityShare.toFixed(1)}%</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Slider
                      value={[alloc.equityShare]}
                      onValueChange={([v]) => handleAllocationChange(index, 'equityShare', v)}
                      min={0.5}
                      max={50}
                      step={0.5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={alloc.equityShare}
                      onChange={(e) => handleAllocationChange(index, 'equityShare', Number(e.target.value) || 0)}
                      className="w-28 font-mono text-sm"
                      step={0.5}
                    />
                  </div>
                </div>

                {/* Royalty */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Revenue Royalty
                    </Label>
                    <span className="font-mono text-sm font-semibold">{alloc.royaltyPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Slider
                      value={[alloc.royaltyPercent]}
                      onValueChange={([v]) => handleAllocationChange(index, 'royaltyPercent', v)}
                      min={0}
                      max={10}
                      step={0.5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={alloc.royaltyPercent}
                      onChange={(e) => handleAllocationChange(index, 'royaltyPercent', Number(e.target.value) || 0)}
                      className="w-28 font-mono text-sm"
                      step={0.5}
                    />
                  </div>
                  {alloc.royaltyPercent > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Investor receives {alloc.royaltyPercent}% of gross revenue until {formatCurrency(alloc.amount * 2)} repaid
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {includedAllocations.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">Toggle investors on to include them in your deal</p>
        </div>
      )}
    </div>
  );
};

export default InvestorNegotiation;
