import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import SaaSPricingCalculatorClient from './SaaSPricingCalculatorClient';

export const metadata: Metadata = {
  title: 'SaaS Pricing Calculator — Free MRR, LTV & Churn Modeler | Scenarical',
  description: 'Model your SaaS pricing, MRR growth, LTV:CAC ratio, and payback period. Simulate churn scenarios and benchmark against industry averages in real time.',
};

export default function SaaSPricingCalculatorPage() {
  const jsonLd = generateToolJsonLd('saas-pricing-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SaaSPricingCalculatorClient />
    </>
  );
}
