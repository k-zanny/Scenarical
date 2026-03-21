import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import LandingPageEstimatorClient from './LandingPageEstimatorClient';

export const metadata: Metadata = {
  title: 'Landing Page Conversion Estimator — Free Online Calculator | Scenarical',
  description: 'Estimate landing page revenue by adjusting conversion rate, traffic, bounce rate, and costs. See how you compare to industry benchmarks and find your path to profitability.',
};

export default function LandingPageEstimatorPage() {
  const jsonLd = generateToolJsonLd('landing-page-estimator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LandingPageEstimatorClient />
    </>
  );
}
