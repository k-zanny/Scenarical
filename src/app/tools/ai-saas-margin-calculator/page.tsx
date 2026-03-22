import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import AISaaSMarginCalculatorClient from './AISaaSMarginCalculatorClient';

export const metadata: Metadata = {
  title: 'AI SaaS Margin Calculator — Model Gross Margins for AI Products | Scenarical',
  description: 'Calculate gross margins for AI-powered SaaS products. Model LLM costs, infrastructure, and support expenses against revenue to optimize your AI SaaS unit economics.',
};

export default function AISaaSMarginCalculatorPage() {
  const jsonLd = generateToolJsonLd('ai-saas-margin-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AISaaSMarginCalculatorClient />
    </>
  );
}
