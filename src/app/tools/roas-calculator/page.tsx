import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ROASCalculatorClient from './ROASCalculatorClient';

export const metadata: Metadata = {
  title: 'ROAS Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate Return on Ad Spend (ROAS) across multiple scenarios. Compare channels, adjust budgets, and see profitability in real time with industry benchmarks.',
};

export default function ROASCalculatorPage() {
  const jsonLd = generateToolJsonLd('roas-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ROASCalculatorClient />
    </>
  );
}
