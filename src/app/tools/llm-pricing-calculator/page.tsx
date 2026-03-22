import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import LLMPricingCalculatorClient from './LLMPricingCalculatorClient';

export const metadata: Metadata = {
  title: 'LLM API Pricing Calculator — Compare AI Model Costs | Scenarical',
  description: 'Compare API pricing for GPT-4o, Claude Sonnet 4, Gemini 2.5, DeepSeek, and more. Calculate monthly costs by token usage and see which LLM fits your budget.',
};

export default function LLMPricingCalculatorPage() {
  const jsonLd = generateToolJsonLd('llm-pricing-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LLMPricingCalculatorClient />
    </>
  );
}
