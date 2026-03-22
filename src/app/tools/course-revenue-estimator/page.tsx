import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import CourseRevenueEstimatorClient from './CourseRevenueEstimatorClient';

export const metadata: Metadata = {
  title: 'Course Launch Revenue Estimator — Free Online Calculator | Scenarical',
  description: 'Estimate course launch revenue, enrollment rates, and ROI. Model landing page conversions, email funnels, upsells, and refund rates with real-time benchmarks.',
};

export default function CourseRevenueEstimatorPage() {
  const jsonLd = generateToolJsonLd('course-revenue-estimator');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CourseRevenueEstimatorClient />
    </>
  );
}
