import { Metadata } from 'next';
import { generateToolMetadata, generateToolJsonLd } from '@/components/ToolPageWrapper';
import AdBudgetPlannerClient from './AdBudgetPlannerClient';

const SLUG = 'ad-budget-planner';

export const metadata: Metadata = {
  ...generateToolMetadata(SLUG),
  title: 'Ad Budget Planner — Free Online Calculator | Scenarical',
};

export default function AdBudgetPlannerPage() {
  const jsonLd = generateToolJsonLd(SLUG);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AdBudgetPlannerClient />
    </>
  );
}
