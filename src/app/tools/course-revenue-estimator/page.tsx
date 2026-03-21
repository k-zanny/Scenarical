import { Metadata } from 'next';
import { getToolBySlug } from '@/lib/tools-data';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ComingSoon from '@/components/ComingSoon';

const tool = getToolBySlug('course-revenue-estimator');

export const metadata: Metadata = {
  title: `${tool?.name || 'course-revenue-estimator'} — Coming Soon | Scenarical`,
  description: tool?.description || '',
};

export default function Page() {
  const jsonLd = generateToolJsonLd('course-revenue-estimator');
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ComingSoon slug="course-revenue-estimator" />
    </>
  );
}
