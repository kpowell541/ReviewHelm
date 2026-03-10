import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Data Storage',
    body: 'Your checklist progress, session data, and preferences are stored locally on your device. If you sign in, your data is synced to our servers so you can access it across devices.',
  },
  {
    title: 'API Keys',
    body: 'Your Anthropic API key is stored securely on your device and is never sent to ReviewHelm servers. It is only used to communicate directly with the Anthropic API for AI features.',
  },
  {
    title: 'AI Features',
    body: 'When you use AI-powered features (deep dives, comment drafting, tutoring), your prompts and checklist context are sent to the Anthropic API. ReviewHelm does not store or log these interactions on its servers.',
  },
  {
    title: 'Analytics',
    body: 'ReviewHelm does not use third-party analytics or tracking services. Usage statistics (session counts, completion rates) are calculated locally on your device.',
  },
  {
    title: 'Data Deletion',
    body: 'You can delete all your local data at any time by clearing the app\'s storage. If you have a synced account, contact us to request full deletion of your server-side data.',
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
