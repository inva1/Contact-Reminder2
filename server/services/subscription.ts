import Stripe from 'stripe';
import { db } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro'
}

export interface SubscriptionLimits {
  maxContacts: number;
  dailyAiSuggestions: number;
  hasCloudSync: boolean;
  hasWhatsappIntegration: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 5,
    dailyAiSuggestions: 2,
    hasCloudSync: false,
    hasWhatsappIntegration: false
  },
  [SubscriptionTier.BASIC]: {
    maxContacts: 20,
    dailyAiSuggestions: 10,
    hasCloudSync: true,
    hasWhatsappIntegration: false
  },
  [SubscriptionTier.PRO]: {
    maxContacts: Infinity,
    dailyAiSuggestions: 50,
    hasCloudSync: true,
    hasWhatsappIntegration: true
  }
};

export async function createTrialSubscription(userId: number) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await db.insert('subscriptions').values({
    user_id: userId,
    tier: SubscriptionTier.PRO,
    trial_end: trialEnd,
    active: true
  });
}

export async function createSubscription(userId: number, priceId: string) {
  const user = await db.select().from('users').where({ id: userId }).first();
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/settings?subscription=success`,
    cancel_url: `${process.env.APP_URL}/settings?subscription=canceled`,
    metadata: { userId: userId.toString() }
  });

  return session.url;
}

export async function handleSubscriptionWebhook(event: Stripe.Event) {
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = parseInt(subscription.metadata.userId);

    await db.update('subscriptions')
      .set({
        stripe_subscription_id: subscription.id,
        tier: subscription.items.data[0].price.nickname as SubscriptionTier,
        trial_end: null,
        active: true
      })
      .where({ user_id: userId });
  }
}

export async function checkSubscriptionLimits(userId: number) {
  const subscription = await db.select()
    .from('subscriptions')
    .where({ user_id: userId, active: true })
    .first();

  if (!subscription) {
    return TIER_LIMITS[SubscriptionTier.FREE];
  }

  return TIER_LIMITS[subscription.tier];
}
