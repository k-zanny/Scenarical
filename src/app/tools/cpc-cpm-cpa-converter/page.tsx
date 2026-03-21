import { Metadata } from 'next';
import { generateToolJsonLd } from '@/components/ToolPageWrapper';
import CPCCPMCPAConverterClient from './CPCCPMCPAConverterClient';

export const metadata: Metadata = {
  title: 'CPC/CPM/CPA Converter — Free Online Calculator | Scenarical',
  description: 'Convert between CPC, CPM, and CPA instantly. Compare your ad costs to industry benchmarks across Google, Facebook, Instagram, LinkedIn, and TikTok — with real-time scenario modeling.',
};

export default function CPCCPMCPAConverterPage() {
  const jsonLd = generateToolJsonLd('cpc-cpm-cpa-converter');

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CPCCPMCPAConverterClient />
    </>
  );
}
