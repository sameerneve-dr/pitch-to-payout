import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { 
  Waves, 
  Users, 
  DollarSign, 
  ArrowRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: billingLoading } = useBilling();
  const navigate = useNavigate();

  // Don't auto-redirect - let users see the landing page first
  // They can manually navigate to /app or /plans

  // Only show loading if still checking auth (very brief)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[var(--neon-primary)]">
              <Waves className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SharkBank</span>
          </div>
          <nav className="flex items-center gap-4">
            {user && !user.is_anonymous ? (
              <Link to="/app">
                <Button size="sm" className="shadow-[var(--neon-primary)]">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="shadow-[var(--neon-primary)]">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            One Pitch, One Click,{' '}
            <span className="text-primary drop-shadow-[0_0_20px_hsl(158_100%_50%/0.5)]">Money Moves</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            SharkBank brings Shark Tank to your screen. Type your pitch, meet investors, 
            and close a deal in minutes—not months.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="text-lg px-8 shadow-[var(--neon-primary)]"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8"
              >
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-xl p-8 border border-border hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Real Investors</h3>
            <p className="text-muted-foreground">
              3-5 personas with unique investment theses ask sharp questions about your startup.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-8 border border-border hover:border-secondary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Real Deal Flow Generator</h3>
            <p className="text-muted-foreground">
              Generates real allocations, equity splits, and post-money valuation in seconds.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-8 border border-border hover:border-accent/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">One-Click Execution</h3>
            <p className="text-muted-foreground">
              Accept the deal and move $100k+ with a single click. Real money, real fast.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-card rounded-2xl p-12 border border-border">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">
            This replaces weeks of fundraising meetings with one execution flow.
          </h2>
          <p className="text-muted-foreground mb-8">
            Stop scheduling meetings. Start closing deals.
          </p>
          <Link to="/signup">
            <Button size="lg" className="shadow-[var(--neon-primary)]">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          SharkBank • Dive Into Deals
        </div>
      </footer>
    </div>
  );
};

export default Index;
