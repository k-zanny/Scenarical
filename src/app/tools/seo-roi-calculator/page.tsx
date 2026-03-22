import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import SEOROICalculatorClient from './SEOROICalculatorClient';

export const metadata: Metadata = {
  title: 'SEO ROI Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate your SEO return on investment over 12 months. Model traffic growth, organic conversions, and break-even timelines with real-time benchmarks.',
};

export default function SEOROICalculatorPage() {
  const jsonLd = generateToolJsonLd('seo-roi-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SEOROICalculatorClient />
    </>
  );
}
