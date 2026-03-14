import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { StripeWebhookProcessor } from './stripe-webhook-processor.service';
import type { AuthenticatedUser } from '../common/auth/types';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';

/** Maps our plan names to Stripe price lookup keys. */
const PLAN_LOOKUP_KEYS: Record<string, string> = {
  starter: 'reviewhelm_starter_monthly',
  advanced: 'reviewhelm_advanced_monthly',
  pro: 'reviewhelm_pro_monthly',
  premium: 'reviewhelm_premium_monthly',
};

type SubscriptionPlan = 'starter' | 'advanced' | 'pro' | 'premium';

const TOPUP_AMOUNTS = [1, 5, 10, 20] as const;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);
  private readonly isProduction: boolean;
  private readonly paymentRedirectHosts: Set<string>;
  private readonly webhookMaxPayloadBytes: number;

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
    private readonly webhookProcessor: StripeWebhookProcessor,
  ) {
    const secretKey = this.config.get('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    this.isProduction = this.config.get('NODE_ENV') === 'production';
    this.paymentRedirectHosts = new Set(
      this.parseHostList(this.config.get('ALLOWED_ORIGINS')),
    );
    const apiPublicHost = this.extractHost(this.config.get('API_PUBLIC_URL'));
    if (apiPublicHost) {
      this.paymentRedirectHosts.add(apiPublicHost);
    }
    if (this.isProduction && this.paymentRedirectHosts.size === 0) {
      this.logger.warn(
        'No configured redirect allowlist hostnames found; payment return URLs will only allow localhost.',
      );
    }

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not set — payment features disabled');
    }
    this.webhookMaxPayloadBytes = this.config.get('STRIPE_WEBHOOK_MAX_PAYLOAD_BYTES');
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create a Stripe Checkout Session for a subscription plan upgrade.
   */
  async createSubscriptionCheckout(
    authUser: AuthenticatedUser,
    plan: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string,
    options?: { trial?: boolean; idempotencyKey?: string },
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const validatedSuccessUrl = this.validateRedirectUrl(successUrl, 'successUrl');
    const validatedCancelUrl = this.validateRedirectUrl(cancelUrl, 'cancelUrl');
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

    const subscriptionData: Stripe.Checkout.SessionCreateParams['subscription_data'] = {
      metadata: { userId: user.id, plan },
    };

    // Add trial period if requested (Advanced, Pro, and Premium — not Starter)
    if (options?.trial && plan !== 'starter') {
      subscriptionData.trial_period_days = 14;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      success_url: validatedSuccessUrl,
      cancel_url: validatedCancelUrl,
      metadata: { userId: user.id, plan },
      subscription_data: subscriptionData,
    }, options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined);

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
    idempotencyKey?: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const validatedSuccessUrl = this.validateRedirectUrl(successUrl, 'successUrl');
    const validatedCancelUrl = this.validateRedirectUrl(cancelUrl, 'cancelUrl');
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
      success_url: validatedSuccessUrl,
      cancel_url: validatedCancelUrl,
      metadata: { userId: user.id, type: 'topup', amountUsd: String(amountUsd) },
    }, idempotencyKey ? { idempotencyKey } : undefined);

    return { url: session.url! };
  }

  /**
   * Create a Stripe billing portal session so users can manage subscriptions.
   */
  async createPortalSession(
    authUser: AuthenticatedUser,
    returnUrl: string,
    idempotencyKey?: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const user = await upsertUserFromAuth(this.prisma, authUser);
    const validatedReturnUrl = this.validateRedirectUrl(returnUrl, 'returnUrl');
    const customerId = await this.getOrCreateCustomer(user.id, user.email);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: validatedReturnUrl,
    }, idempotencyKey ? { idempotencyKey } : undefined);

    return { url: session.url };
  }

  /**
   * Verify and parse a Stripe webhook event.
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe not configured');
    if (!this.webhookSecret) {
      throw new BadRequestException('Missing Stripe webhook secret');
    }
    if (payload.length === 0) {
      throw new BadRequestException('Webhook payload is empty');
    }
    if (payload.length > this.webhookMaxPayloadBytes) {
      throw new BadRequestException('Webhook payload is too large');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Handle relevant Stripe webhook events.
   * Delegates to StripeWebhookProcessor for event processing and replay protection.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    return this.webhookProcessor.handleWebhookEvent(event);
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private parseHostList(raw: string): string[] {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .flatMap((entry) => {
        try {
          return [new URL(entry).hostname.toLowerCase()];
        } catch {
          return [];
        }
      })
      .filter(Boolean);
  }

  private extractHost(value: string): string | null {
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private validateRedirectUrl(value: string, fieldName: string): string {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new BadRequestException(`${fieldName} must use http(s) protocol`);
    }

    const host = parsed.hostname.toLowerCase();
    if (!host) {
      throw new BadRequestException(`${fieldName} must include a hostname`);
    }

    const isLocal = LOCAL_HOSTS.has(host);
    if (this.isProduction && !isLocal) {
      if (this.paymentRedirectHosts.size > 0 && !this.paymentRedirectHosts.has(host)) {
        throw new BadRequestException(`${fieldName} host "${host}" is not allowlisted`);
      }
    }

    if (this.isProduction && parsed.protocol === 'http:') {
      throw new BadRequestException(`${fieldName} must use HTTPS`);
    }

    if (parsed.username || parsed.password) {
      throw new BadRequestException(`${fieldName} must not include credentials`);
    }

    return parsed.toString();
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
