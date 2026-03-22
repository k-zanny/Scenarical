import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import DAImpactCalculatorClient from './DAImpactCalculatorClient';

export const metadata: Metadata = {
  title: 'Domain Authority Impact Calculator — Free Online Calculator | Scenarical',
  description: 'Estimate how domain authority improvements impact your organic traffic and ROI. Model link-building investment, DA growth timelines, and traffic projections.',
};

export default function DAImpactCalculatorPage() {
  const jsonLd = generateToolJsonLd('da-impact-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <DAImpactCalculatorClient />
    </>
  );
}
