import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Acceptance',
    body: 'By using ReviewHelm, you agree to these terms. If you do not agree, please discontinue use of the application.',
  },
  {
    title: 'Intended Use',
    body: 'ReviewHelm is an educational tool for improving code review practices. It is intended for personal and professional development. You may not use it to misrepresent automated output as your own expert analysis.',
  },
  {
    title: 'Subscriptions and Billing',
    body: 'ReviewHelm offers five subscription tiers: Free, Starter ($3/month), Advanced ($5/month), Pro ($8/month), and Premium ($12/month). Subscriptions are billed monthly and renew automatically until cancelled. By subscribing, you authorize ReviewHelm LLC to charge your payment method on a recurring monthly basis. You can cancel at any time from Settings.',
  },
  {
    title: 'Free Trials',
    body: 'Advanced, Pro, and Premium subscriptions may include a 2-week free trial for new users. You will not be charged during the trial period. If you do not cancel before the trial ends, your subscription will automatically convert to a paid subscription and your payment method will be charged. Premium trials include $1 in AI credits. Advanced and Pro trials do not include AI credits.',
  },
  {
    title: 'AI Credits',
    body: 'Premium subscriptions include $3/month in AI credits. Only Premium subscribers can use AI-powered features. Additional credits can be purchased in $1, $5, $10, or $20 increments. AI credits expire at the end of each billing month (approximately 30 days from your billing cycle start) and do not roll over. You must have sufficient credits to use AI features. Upon cancellation, remaining credits are prorated — you receive a prorated refund based on the time remaining in your billing period, not the full unused credit value.',
  },
  {
    title: 'Delivery and Access',
    body: 'Access to paid features is granted immediately upon successful payment. All services are delivered digitally through the ReviewHelm application.',
  },
  {
    title: 'API Usage',
    body: 'AI features are powered by the Anthropic API. Usage is metered and deducted from your AI credit balance. ReviewHelm provides usage tracking as a convenience, but actual costs may vary based on model selection and prompt complexity.',
  },
  {
    title: 'Content Accuracy',
    body: 'Checklists, guides, and AI-generated content are provided "as is" without warranty. ReviewHelm makes no guarantees about the accuracy, completeness, or suitability of any content for your specific use case.',
  },
  {
    title: 'Limitation of Liability',
    body: 'ReviewHelm LLC and its contributors shall not be liable for any damages arising from the use of this application, including but not limited to bugs shipped, security vulnerabilities missed, or code quality issues in reviewed code.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of ReviewHelm after changes constitutes acceptance of the updated terms.',
  },
  {
    title: 'Business Information',
    body: 'ReviewHelm is operated by ReviewHelm LLC.\n\nContact: support@reviewhelm.app',
  },
];

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      title="Terms of Use"
      intro="These terms govern your use of the ReviewHelm application."
      sections={SECTIONS}
      lastUpdated="March 2026"
    />
  );
}
