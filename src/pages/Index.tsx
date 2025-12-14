import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Zap, 
  Users, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleStartPanel = () => {
    if (user) {
      navigate('/new');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Investor Panel</span>
          </div>
          <nav className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link to="/demo">
                      <Button variant="ghost" size="sm">Demo</Button>
                    </Link>
                    <Link to="/history">
                      <Button variant="ghost" size="sm">History</Button>
                    </Link>
                    <Link to="/billing">
                      <Button variant="ghost" size="sm">Billing</Button>
                    </Link>
                    <Link to="/new">
                      <Button size="sm">New Pitch</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/demo">
                      <Button variant="ghost" size="sm">Demo</Button>
                    </Link>
                    <Link to="/auth">
                      <Button size="sm">Sign In</Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Demo Mode - Test Payments Active
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            One Pitch, One Click,{' '}
            <span className="text-primary">Money Moves</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Investor Panel brings Shark Tank to your screen. Type your pitch, meet AI investors, 
            and close a deal in minutes—not months.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleStartPanel}
              className="text-lg px-8"
            >
              Start a Panel
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/demo')}
              className="text-lg px-8"
            >
              Try Sample Pitch
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-xl p-8 border border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">AI Investor Panel</h3>
            <p className="text-muted-foreground">
              3-5 AI personas with unique investment theses ask sharp questions about your startup.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-8 border border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Live Deal Generation</h3>
            <p className="text-muted-foreground">
              AI generates real allocations, equity splits, and post-money valuation in seconds.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-8 border border-border">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-primary" />
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
          <Button size="lg" onClick={handleStartPanel}>
            Launch Your Panel
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          Investor Panel Demo • Powered by AI
        </div>
      </footer>
    </div>
  );
};

export default Index;
