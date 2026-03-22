import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import TrafficValueCalculatorClient from './TrafficValueCalculatorClient';

export const metadata: Metadata = {
  title: 'Blog Traffic Value Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate the ad-equivalent value of your organic traffic, monthly organic revenue, and annual savings versus paid acquisition. Compare organic vs paid with real-time benchmarks.',
};

export default function TrafficValueCalculatorPage() {
  const jsonLd = generateToolJsonLd('traffic-value-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TrafficValueCalculatorClient />
    </>
  );
}
