import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import { TierService } from './tier.service';
import type { AuthenticatedUser } from '../common/auth/types';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';

/** Maps our plan names to Stripe price lookup keys. */
const PLAN_LOOKUP_KEYS: Record<string, string> = {
  pro: 'reviewhelm_pro_monthly',
  premium: 'reviewhelm_premium_monthly',
};

const TOPUP_AMOUNTS = [1, 5, 10] as const;

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly tierService: TierService,
  ) {
    const secretKey = this.config.get('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not set — payment features disabled');
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create a Stripe Checkout Session for a subscription plan upgrade.
   */
  async createSubscriptionCheckout(
    authUser: AuthenticatedUser,
    plan: 'pro' | 'premium',
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const customerId = await this.getOrCreateCustomer(user.id, user.email);
    const lookupKey = PLAN_LOOKUP_KEYS[plan];

    // Find the price by lookup key
    const prices = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new Error(`No Stripe price found for lookup key: ${lookupKey}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user.id, plan },
      subscription_data: {
        metadata: { userId: user.id, plan },
      },
    });

    return { url: session.url! };
  }

  /**
   * Create a Stripe Checkout Session for a one-time credit top-up.
   */
  async createTopUpCheckout(
    authUser: AuthenticatedUser,
    amountUsd: (typeof TOPUP_AMOUNTS)[number],
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const customerId = await this.getOrCreateCustomer(user.id, user.email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountUsd * 100,
            product_data: {
              name: `ReviewHelm AI Credit Top-Up ($${amountUsd})`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: user.id, type: 'topup', amountUsd: String(amountUsd) },
    });

    return { url: session.url! };
  }

  /**
   * Create a Stripe billing portal session so users can manage subscriptions.
   */
  async createPortalSession(
    authUser: AuthenticatedUser,
    returnUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const customerId = await this.getOrCreateCustomer(user.id, user.email);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Verify and parse a Stripe webhook event.
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe not configured');
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Handle relevant Stripe webhook events.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.trial_will_end':
        this.logger.log(
          `Trial ending soon for subscription ${(event.data.object as Stripe.Subscription).id}`,
        );
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('Checkout session completed without userId metadata');
      return;
    }

    if (session.metadata?.type === 'topup') {
      const amountUsd = Number(session.metadata.amountUsd);
      if (amountUsd > 0) {
        await this.creditService.addCredits(
          userId,
          amountUsd,
          'topup',
          `Stripe top-up $${amountUsd}`,
          { stripeSessionId: session.id },
        );
        this.logger.log(`Top-up $${amountUsd} credited to user ${userId}`);
      }
      return;
    }

    // Subscription checkout — tier is set via subscription.updated event
    this.logger.log(`Subscription checkout completed for user ${userId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const status = subscription.status;
    if (status !== 'active' && status !== 'trialing') {
      // Subscription lapsed — downgrade to free
      await this.downgradeToFree(userId);
      return;
    }

    const plan = subscription.metadata?.plan as 'pro' | 'premium' | undefined;
    if (!plan) return;

    const tier = plan === 'premium' ? 'premium' : 'pro';
    const now = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        billingCycleStart: now,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
      },
    });

    // Grant initial credits for premium users
    if (tier === 'premium') {
      await this.creditService.addCredits(
        userId,
        10,
        'subscription_grant',
        'Premium subscription credit grant',
        { stripeSubscriptionId: subscription.id },
      );
    }

    this.logger.log(`User ${userId} upgraded to ${tier}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;
    await this.downgradeToFree(userId);
    this.logger.log(`User ${userId} subscription cancelled — downgraded to free`);
  }

  private async downgradeToFree(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier: 'free',
        billingCycleStart: null,
        stripeSubscriptionId: null,
      },
    });
  }

  private async getOrCreateCustomer(
    userId: string,
    email: string | null,
  ): Promise<string> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email: email ?? undefined,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }
}
