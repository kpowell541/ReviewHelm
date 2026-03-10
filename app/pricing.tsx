import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Free',
    body: 'PR management and checklists at no cost. Track your pull requests, use curated review checklists, and build better review habits — no account required.\n\nNo credit card needed. No trial period.',
  },
  {
    title: 'Pro — $5/month',
    body: 'Everything in Free, plus learning features to level up your review skills.\n\nIncludes:\n- Knowledge gap tracking\n- Spaced repetition review queue\n- Session history and progress trends\n- Bookmarks and search\n\n2-week free trial. Cancel anytime.',
  },
  {
    title: 'Premium — $15/month',
    body: 'Everything in Pro, plus AI-powered features to accelerate your learning.\n\nIncludes:\n- AI tutor deep dives on any checklist item\n- AI-assisted comment drafting\n- AI-generated session summaries\n- $10/month in AI credits included\n- Choose your preferred AI model (Haiku, Sonnet, or Opus)\n\n2-week free trial with $1 in AI credits. Cancel anytime.',
  },
  {
    title: 'AI Credits',
    body: 'AI features consume credits based on model and usage. Premium subscriptions include $10/month in credits.\n\nNeed more? Top up anytime in Settings:\n- $1 credit pack\n- $5 credit pack\n- $10 credit pack\n\nThe full amount of each top-up goes directly to your AI credit balance. Credits expire at the end of each billing month. You can view your current credit balance and usage in Settings.',
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
