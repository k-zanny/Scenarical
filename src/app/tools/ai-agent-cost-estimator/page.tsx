import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import AIAgentCostEstimatorClient from './AIAgentCostEstimatorClient';

export const metadata: Metadata = {
  title: 'AI Agent Cost Estimator — Calculate Agent Infrastructure Costs | Scenarical',
  description: 'Estimate the cost of running AI agents including LLM API calls, tool usage, and multi-step workflows. Model daily, monthly, and annual infrastructure spend.',
};

export default function AIAgentCostEstimatorPage() {
  const jsonLd = generateToolJsonLd('ai-agent-cost-estimator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AIAgentCostEstimatorClient />
    </>
  );
}
