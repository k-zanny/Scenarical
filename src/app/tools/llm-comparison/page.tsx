import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import LLMComparisonClient from './LLMComparisonClient';

export const metadata: Metadata = {
  title: 'Claude vs ChatGPT vs Gemini Comparison Calculator — Free Tool | Scenarical',
  description: 'Compare LLM costs across Claude, ChatGPT, Gemini, DeepSeek, and more. Calculate monthly API costs, find the cheapest model for your context window needs, and visualize cost differences in real time.',
};

export default function LLMComparisonPage() {
  const jsonLd = generateToolJsonLd('llm-comparison');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <LLMComparisonClient />
    </>
  );
}
