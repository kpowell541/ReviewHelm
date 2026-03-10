import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Data Storage',
    body: 'Your checklist progress, session data, and preferences are stored locally on your device. If you sign in, your data is synced to our servers so you can access it across devices. Sensitive data including API keys is encrypted and tokenized at rest.',
  },
  {
    title: 'Payment Information',
    body: 'Payments are processed by Stripe. ReviewHelm LLC does not store your credit card number or payment card details on its servers. Stripe may store your payment information in accordance with their privacy policy. We retain only the information necessary to manage your subscription: your subscription tier, billing dates, credit balance, and credit expiry dates.',
  },
  {
    title: 'AI Features',
    body: 'When you use AI-powered features (deep dives, comment drafting, tutoring), your prompts and checklist context are sent to the Anthropic API. ReviewHelm does not store or log the content of these interactions on its servers. We do track usage metrics (token counts, model used, feature used) for billing and credit deduction purposes.',
  },
  {
    title: 'Analytics',
    body: 'ReviewHelm does not use third-party analytics or tracking services. Usage statistics (session counts, completion rates) are calculated locally on your device.',
  },
  {
    title: 'Data Deletion',
    body: 'You can delete all your local data at any time by clearing the app\'s storage. If you have a synced account, contact us at kaitlin@nesttend.app to request full deletion of your server-side data.',
  },
  {
    title: 'Business Information',
    body: 'ReviewHelm is operated by ReviewHelm LLC.\n\nContact: kaitlin@nesttend.app',
  },
];

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy"
      intro="ReviewHelm is designed with your privacy in mind. Here is how your data is handled."
      sections={SECTIONS}
      lastUpdated="March 2026"
    />
  );
}
