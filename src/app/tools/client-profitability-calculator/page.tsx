import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import ClientProfitabilityClient from './ClientProfitabilityClient';

export const metadata: Metadata = {
  title: 'Client Profitability Calculator — Free Margin & Rate Analyzer | Scenarical',
  description: 'Calculate client profitability, effective hourly rate, and profit margins for freelancers and agencies. Account for scope creep and benchmark against industry averages.',
};

export default function ClientProfitabilityCalculatorPage() {
  const jsonLd = generateToolJsonLd('client-profitability-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ClientProfitabilityClient />
    </>
  );
}
