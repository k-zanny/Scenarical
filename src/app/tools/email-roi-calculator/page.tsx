import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import EmailROICalculatorClient from './EmailROICalculatorClient';

export const metadata: Metadata = {
  title: 'Email ROI Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate your email marketing ROI, revenue per subscriber, and cost per conversion. Simulate list size, open rates, and click-through scenarios with real-time industry benchmarks.',
};

export default function EmailROICalculatorPage() {
  const jsonLd = generateToolJsonLd('email-roi-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EmailROICalculatorClient />
    </>
  );
}
