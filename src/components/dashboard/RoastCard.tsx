import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Roast } from '@/hooks/useRoasts';

interface RoastCardProps {
  roast: Roast;
  onDelete: (id: string) => void;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    completed: { label: 'Completed', className: 'bg-[hsl(var(--status-completed))]' },
    pending: { label: 'Pending', className: 'bg-[hsl(var(--status-pending))]' },
    processing: { label: 'Processing', className: 'bg-[hsl(var(--status-processing))]' },
    failed: { label: 'Failed', className: 'bg-[hsl(var(--status-failed))]' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Badge className={`${config.className} text-white border-0`}>
      {status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {config.label}
    </Badge>
  );
};

export const RoastCard = ({ roast, onDelete }: RoastCardProps) => {
  return (
    <Card className="bg-card border-border hover:border-accent/50 transition-all duration-300 flex flex-col h-full">
      <CardContent className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-foreground font-semibold truncate text-lg mb-2">
              {new URL(roast.url).hostname}
            </h3>
            <p className="text-muted-foreground text-sm truncate">{roast.url}</p>
          </div>
          {getStatusBadge(roast.status)}
        </div>

        {roast.screenshot_url ? (
          <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
            <img
              src={roast.screenshot_url}
              alt={`Screenshot of ${roast.url}`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center mb-4">
            <ExternalLink className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        <div className="flex items-center justify-between">
          {roast.score !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{roast.score}</span>
              <span className="text-muted-foreground text-sm">/100</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No score yet</span>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(roast.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          asChild
          className="flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(237,81%,62%)] hover:opacity-90"
        >
          <Link to={`/results/${roast.id}`}>View Details</Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDelete(roast.id)}
          className="border-destructive text-destructive hover:bg-destructive hover:text-white min-w-[44px] min-h-[44px]"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
