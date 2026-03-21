import { Metadata } from 'next';
import { getToolBySlug } from '@/lib/tools-data';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ComingSoon from '@/components/ComingSoon';

const tool = getToolBySlug('llm-comparison');

export const metadata: Metadata = {
  title: `${tool?.name || 'llm-comparison'} — Coming Soon | Scenarical`,
  description: tool?.description || '',
};

export default function Page() {
  const jsonLd = generateToolJsonLd('llm-comparison');
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ComingSoon slug="llm-comparison" />
    </>
  );
}
