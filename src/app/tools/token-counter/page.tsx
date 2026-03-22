import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import TokenCounterClient from './TokenCounterClient';

export const metadata: Metadata = {
  title: 'Token Counter & Estimator — Estimate LLM Token Costs | Scenarical',
  description: 'Estimate token counts from word counts, calculate input vs output token costs, and project daily and monthly LLM API spending across models.',
};

export default function TokenCounterPage() {
  const jsonLd = generateToolJsonLd('token-counter');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TokenCounterClient />
    </>
  );
}
