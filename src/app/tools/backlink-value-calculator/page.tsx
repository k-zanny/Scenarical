import { Metadata } from 'next';
import { getToolBySlug } from '@/lib/tools-data';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ComingSoon from '@/components/ComingSoon';

const tool = getToolBySlug('backlink-value-calculator');

export const metadata: Metadata = {
  title: `${tool?.name || 'backlink-value-calculator'} — Coming Soon | Scenarical`,
  description: tool?.description || '',
};

export default function Page() {
  const jsonLd = generateToolJsonLd('backlink-value-calculator');
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ComingSoon slug="backlink-value-calculator" />
    </>
  );
}
