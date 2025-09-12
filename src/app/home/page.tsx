'use client';

import { BarChart3, Tag, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { Button } from '@/components/sellemond-bakery/ui/button';
import { FeatureCard } from '@/components/FeatureCard';

export default function Dashboard() {
  const features = [
    {
      title: 'Social Media',
      description:
        'Create and publish LinkedIn posts with our intuitive writing interface. Boost your professional presence effortlessly.',
      icon: Tag,
      status: 'available' as const,
      actionText: 'Start Writing',
      onAction: () => console.log('Navigate to social media'),
    },
    {
      title: 'Analytics',
      description:
        'Track your social media performance and engagement metrics. Get insights to optimize your content strategy.',
      icon: BarChart3,
      status: 'coming-soon' as const,
    },
    {
      title: 'Audience',
      description:
        'Understand your audience and optimize your content strategy. Build meaningful connections with your network.',
      icon: Users,
      status: 'coming-soon' as const,
    },
  ];

  const quickStats = [
    { label: 'Posts Published', value: '47', change: '+12%' },
    { label: 'Engagement Rate', value: '8.2%', change: '+3.1%' },
    { label: 'Followers Growth', value: '234', change: '+5.7%' },
  ];

  return (
    <>
      {/* Header dentro del contenedor del layout (no uses otro wrapper) */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-20 items-center justify-between px-8">
          <h1 className="text-xl font-bold text-black">Home</h1>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Zap className="w-4 h-4 mr-2" />
            Quick Start
          </Button>
        </div>
      </header>

      {/* Main ocupa el resto del alto disponible dentro del flex-col del layout */}
      <main className="flex-1 p-6 space-y-6">
        {/* Header Section */}
        <div className="p-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Alpino AI</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Your comprehensive platform for social media automation and business intelligence. Manage your LinkedIn
              presence and grow your professional network effortlessly.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {quickStats.map((stat) => (
              <div key={stat.label} className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="flex items-center text-sm text-primary font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">Platform Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  status={feature.status}
                  actionText={feature.actionText}
                  onAction={feature.onAction}
                />
              ))}
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="bg-accent/30 rounded-xl p-6 border border-accent/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready to get started?</h3>
                <p className="text-muted-foreground mb-4">
                  Begin by creating your first LinkedIn post or explore our analytics to understand your current
                  performance.
                </p>
                <div className="flex gap-3">
                  <Button variant="default">Create First Post</Button>
                  <Button variant="outline">Explore Analytics</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
