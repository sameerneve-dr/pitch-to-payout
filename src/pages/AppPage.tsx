import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { toast } from 'sonner';
import { 
  Zap, 
  Plus, 
  History, 
  Settings, 
  LogOut,
  Loader2,
  Crown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AppPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isActive, plan, loading: billingLoading } = useBilling();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show welcome toast for subscription success
  useEffect(() => {
    const source = searchParams.get('source');
    const planParam = searchParams.get('plan');
    
    if (source === 'subscription' && planParam) {
      toast.success(`Welcome to SharkBank ${planParam.charAt(0).toUpperCase() + planParam.slice(1)}!`, {
        description: 'Your subscription is now active.',
      });
      // Clear the query params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[var(--neon-primary)]">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SharkBank</span>
            <Badge variant="secondary" className="ml-2 capitalize">
              <Crown className="w-3 h-3 mr-1" />
              {plan}
            </Badge>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/history">
              <Button variant="ghost" size="sm">
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mb-8">
            Ready to pitch to your AI investor panel?
          </p>

          <Link to="/new">
            <Button size="lg" className="shadow-[var(--neon-primary)]">
              <Plus className="w-5 h-5 mr-2" />
              Create New Pitch
            </Button>
          </Link>

          <div className="mt-12 grid gap-4">
            <Link to="/history">
              <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors text-left">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">View Past Pitches</h3>
                <p className="text-muted-foreground text-sm">
                  Review your previous investor panels and deals.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppPage;
