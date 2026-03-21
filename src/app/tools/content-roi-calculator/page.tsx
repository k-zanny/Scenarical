import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ContentROICalculatorClient from './ContentROICalculatorClient';

export const metadata: Metadata = {
  title: 'Content ROI Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate the ROI of your content marketing strategy. Model article output, traffic compounding, lead generation, and cumulative returns over 12 months with real-time benchmarks.',
};

export default function ContentROICalculatorPage() {
  const jsonLd = generateToolJsonLd('content-roi-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ContentROICalculatorClient />
    </>
  );
}
