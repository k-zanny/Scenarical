import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import AdRevenueCalculatorClient from './AdRevenueCalculatorClient';

export const metadata: Metadata = {
  title: 'Ad Revenue Calculator 2026: Estimate Website Earnings | Scenarical',
  description: 'Calculate how much your website can earn from display ads. Real industry RPM benchmarks for blogs, news sites, niche sites. Free tool.',
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
