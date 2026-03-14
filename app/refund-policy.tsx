import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Subscription Cancellation',
    body: 'You may cancel your ReviewHelm subscription at any time from the Settings page. Cancellation takes effect immediately and you will receive a prorated refund for the unused portion of your current billing period.',
  },
  {
    title: 'Prorated Refund Calculation',
    body: 'Your refund is calculated based on the percentage of time remaining in your current billing period. All purchased items — including subscription fees and AI credits — are prorated based on time remaining, not refunded in full.\n\nFor Starter subscriptions ($3/month): you receive back the prorated percentage of $3.\n\nFor Advanced subscriptions ($5/month): you receive back the prorated percentage of $5.\n\nFor Pro subscriptions ($8/month): you receive back the prorated percentage of $8.\n\nFor Premium subscriptions ($13/month): you receive back the prorated percentage of the total $13, which includes the $10 base fee and $3 in AI credits. Remaining unused credits are prorated based on time remaining in the billing period.\n\nExample: if you cancel a Pro subscription with 25% of your billing period remaining, you receive 25% of $8 = $2.00 back.',
  },
  {
    title: 'AI Credit Top-Ups',
    body: 'AI credit top-up purchases ($1, $5, $10, or $20) are non-refundable once purchased. However, if you cancel your Premium subscription, remaining unused AI credits (including top-ups) will be prorated based on the time remaining in your billing period.',
  },
  {
    title: 'Refund Timeline',
    body: 'Refunds are processed within a few business days of cancellation. The refund will be returned to your original payment method. Processing times may vary depending on your bank or card issuer.',
  },
  {
    title: 'Free Trial',
    body: 'If you cancel during your free trial period, you will not be charged. Advanced and Pro trials do not include AI credits. Premium trials include $1 in AI credits — any unused trial credits are forfeited upon cancellation.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about refunds or billing, contact us at support@reviewhelm.app.',
  },
];

export default function RefundPolicyScreen() {
  return (
    <LegalDocumentScreen
      title="Refund Policy"
      intro="We want you to feel confident trying ReviewHelm. Here is how refunds work."
      sections={SECTIONS}
      lastUpdated="March 2026"
    />
  );
}
