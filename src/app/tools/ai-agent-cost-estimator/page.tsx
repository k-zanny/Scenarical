import { Metadata } from 'next';
import { getToolBySlug } from '@/lib/tools-data';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ComingSoon from '@/components/ComingSoon';

const tool = getToolBySlug('ai-agent-cost-estimator');

export const metadata: Metadata = {
  title: `${tool?.name || 'ai-agent-cost-estimator'} — Coming Soon | Scenarical`,
  description: tool?.description || '',
};

export default function Page() {
  const jsonLd = generateToolJsonLd('ai-agent-cost-estimator');
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ComingSoon slug="ai-agent-cost-estimator" />
    </>
  );
}
