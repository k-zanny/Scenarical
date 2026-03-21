import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ABTestCalculatorClient from './ABTestCalculatorClient';

export const metadata: Metadata = {
  title: 'A/B Test Sample Size Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate the exact sample size needed for statistically significant A/B tests. See how confidence level, minimum detectable effect, and traffic volume impact your test duration — with interactive sliders and a live power curve.',
};

export default function ABTestCalculatorPage() {
  const jsonLd = generateToolJsonLd('ab-test-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ABTestCalculatorClient />
    </>
  );
}
