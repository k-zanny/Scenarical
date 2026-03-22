import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import KeywordDifficultyEstimatorClient from './KeywordDifficultyEstimatorClient';

export const metadata: Metadata = {
  title: 'Keyword Difficulty Estimator — Free SEO Calculator | Scenarical',
  description: 'Estimate the cost, time, and ROI of ranking for any keyword. Compare keyword difficulty against your domain authority with real-time benchmarks and scenario modeling.',
};

export default function KeywordDifficultyEstimatorPage() {
  const jsonLd = generateToolJsonLd('keyword-difficulty-estimator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <KeywordDifficultyEstimatorClient />
    </>
  );
}
