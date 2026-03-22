import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import AdRevenueCalculatorClient from './AdRevenueCalculatorClient';

export const metadata: Metadata = {
  title: 'Website Ad Revenue Calculator — Free Online Calculator | Scenarical',
  description: 'Estimate your website ad revenue based on pageviews, RPM, fill rate, and viewability. Model standard vs premium ad inventory to optimize your monetization strategy.',
};

export default function AdRevenueCalculatorPage() {
  const jsonLd = generateToolJsonLd('ad-revenue-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AdRevenueCalculatorClient />
    </>
  );
}
