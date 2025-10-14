import { Card, CardContent } from '@/components/ui/card';
import { Flame, TrendingUp, Clock } from 'lucide-react';
import { Roast } from '@/hooks/useRoasts';
import { startOfWeek } from 'date-fns';

interface DashboardStatsProps {
  roasts: Roast[];
}

export const DashboardStats = ({ roasts }: DashboardStatsProps) => {
  const totalRoasts = roasts.length;
  
  const completedRoasts = roasts.filter(r => r.status === 'completed' && r.score !== null);
  const averageScore = completedRoasts.length > 0
    ? Math.round(completedRoasts.reduce((sum, r) => sum + (r.score || 0), 0) / completedRoasts.length)
    : 0;

  const weekStart = startOfWeek(new Date());
  const thisWeekRoasts = roasts.filter(
    r => new Date(r.created_at) >= weekStart
  ).length;

  const stats = [
    {
      label: 'Total Roasts',
      value: totalRoasts,
      icon: Flame,
      color: 'text-[hsl(var(--accent))]',
    },
    {
      label: 'Average Score',
      value: averageScore > 0 ? `${averageScore}/100` : 'N/A',
      icon: TrendingUp,
      color: 'text-[hsl(var(--status-completed))]',
    },
    {
      label: 'This Week',
      value: thisWeekRoasts,
      icon: Clock,
      color: 'text-[hsl(var(--status-processing))]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
