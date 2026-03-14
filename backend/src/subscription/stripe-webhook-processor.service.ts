import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from './credit.service';
import { RedisService } from '../common/redis/redis.service';

type SubscriptionPlan = 'starter' | 'advanced' | 'pro' | 'premium';

const WEBHOOK_INFLIGHT_TTL_SECONDS = 30;

/** Credit grant amounts by plan and subscription status */
const CREDIT_GRANTS: Record<string, { active: number; trialing: number }> = {
  premium: { active: 3, trialing: 1 },
};

/**
 * Handles Stripe webhook event processing, replay protection,
 * and all subscription/checkout lifecycle events.
 */
@Injectable()
export class StripeWebhookProcessor {
  private readonly logger = new Logger(StripeWebhookProcessor.name);
  private readonly webhookEventTtlSeconds: number;
  private readonly webhookReplayLockPrefix = 'stripe:webhook:event';

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly redis: RedisService,
  ) {
    this.webhookEventTtlSeconds = this.config.get('STRIPE_WEBHOOK_EVENT_TTL_SECONDS');
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const eventId = this.getEventId(event);
    if (!eventId) {
      this.logger.warn('Received webhook event without ID; processing without replay protection');
      await this.processEvent(event);
      return;
    }

    const replayKey = this.getWebhookReplayKey(eventId);
    const shouldProcess = await this.ensureEventCanRun(replayKey);
    if (!shouldProcess) {
      this.logger.warn(`Webhook event ${eventId} was already processed`);
      return;
    }

    try {
      await this.processEvent(event);
      await this.markEventProcessed(replayKey);
    } catch (error) {
      await this.clearEventProcessing(replayKey);
      throw error;
    }
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
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

    this.logger.log(`Subscription checkout completed for user ${userId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const status = subscription.status;
    if (status !== 'active' && status !== 'trialing') {
      await this.downgradeToFree(userId);
      return;
    }

    const plan = subscription.metadata?.plan as SubscriptionPlan | undefined;
    if (!plan) return;

    const tierMap: Record<SubscriptionPlan, 'starter' | 'advanced' | 'pro' | 'premium'> = {
      starter: 'starter',
      advanced: 'advanced',
      pro: 'pro',
      premium: 'premium',
    };
    const tier = tierMap[plan] ?? 'advanced';
    const now = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        billingCycleStart: now,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    const creditConfig = CREDIT_GRANTS[plan];
    if (creditConfig) {
      const grantAmount = status === 'trialing'
        ? creditConfig.trialing
        : creditConfig.active;

      if (grantAmount > 0) {
        const description = status === 'trialing'
          ? 'Premium trial credit grant'
          : 'Premium subscription credit grant';
        await this.creditService.addCredits(
          userId,
          grantAmount,
          'subscription_grant',
          description,
          { stripeSubscriptionId: subscription.id, status },
        );
      }
    }

    this.logger.log(`User ${userId} upgraded to ${tier} (${status})`);
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

  // ── Replay protection ─────────────────────────────────────────────

  private getEventId(event: Stripe.Event): string | null {
    return typeof event.id === 'string' && event.id.trim().length > 0 ? event.id.trim() : null;
  }

  private getWebhookReplayKey(eventId: string): string {
    return `${this.webhookReplayLockPrefix}:${eventId}`;
  }

  private async ensureEventCanRun(key: string): Promise<boolean> {
    try {
      const existingState = await this.redis.get(key);
      if (typeof existingState === 'string' && existingState.length > 0) {
        return false;
      }
      return await this.redis.trySetCooldown(key, 'processing', WEBHOOK_INFLIGHT_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(
        `Webhook replay guard fallback — unable to check state: ${error instanceof Error ? error.message : String(error)}`,
      );
      return true;
    }
  }

  private async markEventProcessed(key: string): Promise<void> {
    try {
      await this.redis.command(['SET', key, 'processed', 'EX', this.webhookEventTtlSeconds]);
    } catch (error) {
      this.logger.warn(
        `Failed to record processed webhook state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async clearEventProcessing(key: string): Promise<void> {
    try {
      await this.redis.delete(key);
    } catch (error) {
      this.logger.warn(
        `Failed to clear webhook processing state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
