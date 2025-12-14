import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface PageHeaderProps {
  backTo?: string;
  backLabel?: string;
}

const PageHeader = ({ backTo, backLabel }: PageHeaderProps) => {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Link to="/">
        <Button variant="ghost" size="icon" title="Home">
          <Home className="w-4 h-4" />
        </Button>
      </Link>
      {backTo && backLabel && (
        <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground">
          ← {backLabel}
        </Link>
      )}
    </div>
  );
};

export default PageHeader;
