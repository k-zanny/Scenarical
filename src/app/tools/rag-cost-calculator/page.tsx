import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import RAGCostCalculatorClient from './RAGCostCalculatorClient';

export const metadata: Metadata = {
  title: 'RAG Cost Calculator — Estimate Retrieval-Augmented Generation Costs | Scenarical',
  description: 'Calculate the full cost of your RAG pipeline including embedding, vector database, and LLM inference costs. Model monthly and annual expenses with real-time cost breakdowns.',
};

export default function RAGCostCalculatorPage() {
  const jsonLd = generateToolJsonLd('rag-cost-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <RAGCostCalculatorClient />
    </>
  );
}
