'use client';

import affiliateData from '@/data/affiliate-links.json';

interface PreRelatedCTAProps {
  toolSlug: string;
}

export default function PreRelatedCTA({ toolSlug }: PreRelatedCTAProps) {
  const toolConfig = affiliateData.tools[toolSlug as keyof typeof affiliateData.tools];
  if (!toolConfig) return null;

  const partner = affiliateData.partners[toolConfig.partner as keyof typeof affiliateData.partners];
  if (!partner) return null;

  const { footer } = toolConfig;

  return (
    <div className="w-full bg-gradient-to-r from-[#1E3A5F] to-[#1E2A4A] border border-[#2A3F5F] rounded-xl p-8 text-center mt-12">
      <h3 className="text-white text-lg font-bold mb-2">
        {footer.headline}
      </h3>
      <p className="text-[#94A3B8] text-sm mb-4 max-w-lg mx-auto">
        {footer.subline}
      </p>
      <a
        href={partner.url}
        target="_blank"
        rel="sponsored noopener"
        className="inline-block bg-[#3B82F6] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#2563EB] transition-colors"
      >
        Start Free Trial →
      </a>
      <p className="text-[#64748B] text-xs mt-3">{partner.socialProof}</p>
    </div>
  );
}
