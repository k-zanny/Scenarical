import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import NewsletterValueCalculatorClient from './NewsletterValueCalculatorClient';

export const metadata: Metadata = {
  title: 'Newsletter Subscriber Value Calculator — Free Online Calculator | Scenarical',
  description: 'Calculate your newsletter subscriber lifetime value, monthly revenue, and LTV-to-CAC ratio. Model sponsorship and paid subscription revenue with real-time benchmarks.',
};

export default function NewsletterValueCalculatorPage() {
  const jsonLd = generateToolJsonLd('newsletter-value-calculator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NewsletterValueCalculatorClient />
    </>
  );
}
