import { LegalDocumentScreen } from '../src/components/LegalDocumentScreen';

const SECTIONS = [
  {
    title: 'Availability',
    body: 'ReviewHelm is currently available only in the United States.',
  },
  {
    title: 'Why You Are Seeing This',
    body: 'Your request appears to originate from outside supported regions for this release.',
  },
  {
    title: 'Need Help?',
    body: 'If you believe this is incorrect, contact kaitlin@nesttend.app and include your approximate location and timestamp.',
  },
];

export default function RegionUnavailableScreen() {
  return (
    <LegalDocumentScreen
      title="Region Unavailable"
      intro="ReviewHelm is temporarily restricted by region while we complete rollout and compliance steps."
      sections={SECTIONS}
      lastUpdated="March 2026"
    />
  );
}
