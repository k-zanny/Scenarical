import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import FreelanceRateCalculatorClient from './FreelanceRateCalculatorClient';

export const metadata: Metadata = {
  title: 'Freelance Rate Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate your ideal freelance hourly rate, daily rate, and monthly revenue based on your income goals, expenses, and billable hours. Compare your rate to industry benchmarks in real time.',
};

export default function FreelanceRateCalculatorPage() {
  const jsonLd = generateToolJsonLd('freelance-rate-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <FreelanceRateCalculatorClient />
    </>
  );
}
