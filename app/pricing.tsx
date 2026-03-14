import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Free',
    body: 'Review PRs with guided checklists at no cost. Use curated checklists for 45+ tech stacks, search across all items, and bookmark important ones.\n\nNo credit card needed. No trial period.',
  },
  {
    title: 'Starter — $3/month',
    body: 'Everything in Free, plus tools to self-review and track your PRs.\n\nIncludes:\n- Polish My PR (self-review mode)\n- PR tracker\n- Deep dive content on every checklist item\n- Past reviews\n- Unlimited sessions\n\nNo trial — start using it immediately.',
  },
  {
    title: 'Advanced — $5/month',
    body: 'Everything in Starter, plus learning features to actively improve your review skills.\n\nIncludes:\n- Learn mode (targeted lessons on your weakest areas)\n- My Gaps (knowledge gap tracking)\n- Spaced repetition (due items resurface for practice)\n\n2-week free trial. Cancel anytime.',
  },
  {
    title: 'Pro — $8/month',
    body: 'Everything in Advanced, plus analytics to measure your growth over time.\n\nIncludes:\n- Trends (compare sessions side-by-side)\n- Readiness dashboard\n- Checklist gap insights\n\n2-week free trial. Cancel anytime.',
  },
  {
    title: 'Premium — $13/month',
    body: 'Everything in Pro, plus AI-powered features to accelerate your learning.\n\nIncludes:\n- AI tutor deep dives on any checklist item (powered by Claude)\n- AI-assisted comment drafting\n- $3/month in AI credits included\n- Choose your preferred AI model (Sonnet or Opus)\n\n2-week free trial with $1 in AI credits. Cancel anytime.',
  },
  {
    title: 'AI Credits',
    body: 'AI features consume credits based on model and usage. Premium subscriptions include $3/month in credits.\n\nNeed more? Top up anytime in Settings:\n- $1 credit pack\n- $5 credit pack\n- $10 credit pack\n- $20 credit pack\n\nThe full amount of each top-up goes directly to your AI credit balance. Credits expire at the end of each billing month. You can view your current credit balance and usage in Settings.',
  },
  {
    title: 'Billing',
    body: 'All subscriptions are billed monthly. Access is granted immediately upon successful payment. There are no annual plans at this time.\n\nPayments are processed securely by Stripe. ReviewHelm LLC does not store your payment card details.',
  },
  {
    title: 'Cancellation',
    body: 'You can cancel your subscription at any time from Settings. Upon cancellation, you will receive a prorated refund for the remaining time in your billing period. See our Refund Policy for full details.',
  },
];

export default function PricingScreen() {
  return (
    <LegalDocumentScreen
      title="Pricing"
      intro="Simple, transparent pricing. Start free, upgrade when you're ready."
      sections={SECTIONS}
      lastUpdated="March 2026"
    />
  );
}
