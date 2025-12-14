import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight } from 'lucide-react';

const BillingCancelPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <X className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Upgrade Cancelled</CardTitle>
          <CardDescription>
            No worries! You can upgrade anytime when you're ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to="/pricing">
            <Button variant="outline" className="w-full">
              View Plans
            </Button>
          </Link>
          <Link to="/">
            <Button className="w-full">
              Back to Home
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingCancelPage;
