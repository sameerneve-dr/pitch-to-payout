import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBilling } from '@/hooks/useBilling';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { 
  Zap, 
  Plus, 
  History, 
  Settings, 
  LogOut,
  Loader2,
  Crown,
  TrendingUp,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AppPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isActive, plan, loading: billingLoading } = useBilling();
  const { profile, getPlanLimits } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const limits = getPlanLimits();
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Founder';

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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-muted-foreground">
              Ready to pitch to your AI investor panel?
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Pitches Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.panels_today ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {limits.maxPanelsPerDay === Infinity ? '∞' : limits.maxPanelsPerDay}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Deals Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.deals_today ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {limits.maxDealsPerDay === Infinity ? '∞' : limits.maxDealsPerDay}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{plan}</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="text-center mb-10">
            <Link to="/new">
              <Button size="lg" className="shadow-[var(--neon-primary)]">
                <Plus className="w-5 h-5 mr-2" />
                Create New Pitch
              </Button>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/history">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    View Past Pitches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Review your previous investor panels and deals.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/settings">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Manage your subscription and preferences.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppPage;
