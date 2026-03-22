import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import BacklinkValueCalculatorClient from './BacklinkValueCalculatorClient';

export const metadata: Metadata = {
  title: 'Backlink Value Calculator — Free Link Quality Estimator | Scenarical',
  description: 'Calculate the true value of any backlink based on domain authority, relevance, link placement, and referral traffic. Determine fair pricing for link-building opportunities.',
};

export default function BacklinkValueCalculatorPage() {
  const jsonLd = generateToolJsonLd('backlink-value-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BacklinkValueCalculatorClient />
    </>
  );
}
