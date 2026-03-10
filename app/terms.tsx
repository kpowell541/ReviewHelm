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
    title: 'API Usage',
    body: 'AI features require your own Anthropic API key. You are responsible for all charges incurred through the Anthropic API. ReviewHelm provides usage tracking as a convenience, but the official billing from Anthropic is authoritative.',
  },
  {
    title: 'Content Accuracy',
    body: 'Checklists, guides, and AI-generated content are provided "as is" without warranty. ReviewHelm makes no guarantees about the accuracy, completeness, or suitability of any content for your specific use case.',
  },
  {
    title: 'Limitation of Liability',
    body: 'ReviewHelm and its contributors shall not be liable for any damages arising from the use of this application, including but not limited to bugs shipped, security vulnerabilities missed, or code quality issues in reviewed code.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of ReviewHelm after changes constitutes acceptance of the updated terms.',
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
