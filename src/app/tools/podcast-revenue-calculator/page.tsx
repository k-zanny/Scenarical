import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import PodcastRevenueCalculatorClient from './PodcastRevenueCalculatorClient';

export const metadata: Metadata = {
  title: 'Podcast Revenue Calculator — Free Sponsorship & Monetization Estimator | Scenarical',
  description: 'Estimate podcast revenue from sponsorships and premium subscribers. Model CPM rates, fill rates, and production costs with real-time industry benchmarks.',
};

export default function PodcastRevenueCalculatorPage() {
  const jsonLd = generateToolJsonLd('podcast-revenue-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PodcastRevenueCalculatorClient />
    </>
  );
}
