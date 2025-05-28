import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function SubscriptionManagement() {
  const { subscription, isLoading } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(true);
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: planId })
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
    }
    setIsUpgrading(false);
  };

  if (isLoading) {
    return <div>Loading subscription details...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Subscription Plans</h2>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Limited features</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li>5 contacts</li>
              <li>2 AI suggestions daily</li>
              <li>Local storage only</li>
              <li>Basic reminders</li>
            </ul>
            <Button
              variant="outline"
              className="w-full"
              disabled={subscription?.tier === 'free'}
            >
              Current Plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic</CardTitle>
            <CardDescription>$1.99/month</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li>20 contacts</li>
              <li>10 AI suggestions daily</li>
              <li>Cloud sync</li>
              <li>Basic reminders</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade('price_basic_monthly')}
              disabled={isUpgrading || subscription?.tier === 'basic'}
            >
              {subscription?.tier === 'basic' ? 'Current Plan' : 'Upgrade'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>$4.99/month</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li>Unlimited contacts</li>
              <li>50 AI suggestions daily</li>
              <li>Cloud sync</li>
              <li>WhatsApp integration</li>
              <li>Contact tagging</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade('price_pro_monthly')}
              disabled={isUpgrading || subscription?.tier === 'pro'}
            >
              {subscription?.tier === 'pro' ? 'Current Plan' : 'Upgrade'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {subscription?.trial_end && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">
            Trial ends on {new Date(subscription.trial_end).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
