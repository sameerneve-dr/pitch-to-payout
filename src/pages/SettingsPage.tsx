import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Trash2, Crown, Zap } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AvatarUpload from '@/components/AvatarUpload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { profile, resetDemoData, loading, refetch } = useProfile();
  const [resetting, setResetting] = useState(false);

  const handleResetDemoData = async () => {
    setResetting(true);
    const { error } = await resetDemoData();
    if (error) {
      toast.error('Failed to reset demo data');
    } else {
      toast.success('Demo data reset successfully');
    }
    setResetting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    window.location.href = '/';
  };

  const getPlanIcon = () => {
    if (profile?.plan === 'pro') return <Crown className="w-5 h-5 text-primary" />;
    if (profile?.plan === 'plus') return <Zap className="w-5 h-5 text-primary" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <PageHeader />

        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Picture */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a photo to personalize your account</CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarUpload
                  userId={user.id}
                  avatarUrl={profile?.avatar_url || null}
                  name={profile?.name || null}
                  onUploadComplete={() => refetch()}
                />
              </CardContent>
            </Card>
          )}

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || 'Anonymous User'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPlanIcon()}
                Current Plan
              </CardTitle>
              <CardDescription>Your subscription status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{profile?.plan || 'Free'} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {profile?.plan_status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {(!profile?.plan || profile.plan === 'free') && (
                  <Link to="/pricing">
                    <Button size="sm">Upgrade</Button>
                  </Link>
                )}
              </div>
              
              {profile && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Daily Usage</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{profile.panels_today}</span>
                      <span className="text-muted-foreground"> panels today</span>
                    </div>
                    <div>
                      <span className="font-medium">{profile.deals_today}</span>
                      <span className="text-muted-foreground"> deals today</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demo Data */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Data</CardTitle>
              <CardDescription>Manage your demo pitches and data</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={resetting}>
                    {resetting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset Demo Data
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Demo Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all your pitches, panels, and deals. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetDemoData}>
                      Reset Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Sign Out */}
          {user && !user.is_anonymous && (
            <Card>
              <CardHeader>
                <CardTitle>Session</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
