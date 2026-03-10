import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Subscription Cancellation',
    body: 'You may cancel your ReviewHelm subscription at any time from the Settings page. Cancellation takes effect immediately and you will receive a prorated refund for the unused portion of your current billing period.',
  },
  {
    title: 'Prorated Refund Calculation',
    body: 'Your refund is calculated based on the percentage of time remaining in your current billing period.\n\nFor Pro subscriptions ($5/month): you receive back the prorated percentage of $5 based on the time remaining.\n\nFor Premium subscriptions ($15/month): you receive back the prorated percentage of the $5 base fee, plus the full value of any remaining unused AI credits.\n\nExample: if you cancel a Pro subscription with 25% of your billing period remaining, you receive 25% of $5 = $1.25 back.',
  },
  {
    title: 'AI Credit Top-Ups',
    body: 'AI credit top-up purchases ($1, $5, or $10) are non-refundable once purchased. However, if you cancel your Premium subscription, the full value of your remaining unused AI credits (including top-ups) will be included in your cancellation refund.',
  },
  {
    title: 'Refund Timeline',
    body: 'Refunds are processed within a few business days of cancellation. The refund will be returned to your original payment method. Processing times may vary depending on your bank or card issuer.',
  },
  {
    title: 'Free Trial',
    body: 'If you cancel during your free trial period, you will not be charged. Pro trials include no credits. Premium trials include $1 in AI credits — any unused trial credits are forfeited upon cancellation.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about refunds or billing, contact us at kaitlin@nesttend.app.',
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
