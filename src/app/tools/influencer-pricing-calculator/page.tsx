import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import InfluencerPricingCalculatorClient from './InfluencerPricingCalculatorClient';

export const metadata: Metadata = {
  title: 'Influencer Pricing Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate influencer rates per post, campaign costs, and CPM based on followers, engagement rate, and platform. Compare pricing across follower tiers with real-time benchmarks.',
};

export default function InfluencerPricingCalculatorPage() {
  const jsonLd = generateToolJsonLd('influencer-pricing-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <InfluencerPricingCalculatorClient />
    </>
  );
}
