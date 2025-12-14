import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight } from 'lucide-react';

const BillingSuccessPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Pro!</CardTitle>
          <CardDescription>
            Your subscription is now active. Enjoy unlimited investor panels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to="/new">
            <Button className="w-full">
              Create a Panel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/billing">
            <Button variant="outline" className="w-full">
              Manage Subscription
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSuccessPage;
