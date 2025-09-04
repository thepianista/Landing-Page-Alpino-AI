import { LucideIcon } from 'lucide-react';
import { Button } from './sellemond-bakery/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './sellemond-bakery/ui/card';

interface FeatureCardProps {
  title: string;
  description: string;
  status?: 'available' | 'coming-soon';
  icon: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const FeatureCard = ({
  title,
  description,
  status = 'available',
  icon: Icon,
  actionText = 'Get Started',
  onAction,
}: FeatureCardProps) => {
  return (
    <Card className="relative group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {status === 'available' ? (
          <Button
            variant="ghost"
            className="text-primary hover:text-primary-foreground hover:bg-primary font-medium"
            onClick={onAction}
          >
            {actionText} →
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground font-medium">Coming Soon</span>
        )}
      </CardContent>
    </Card>
  );
};
