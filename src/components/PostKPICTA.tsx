'use client';

import affiliateData from '@/data/affiliate-links.json';

interface PostKPICTAProps {
  toolSlug: string;
}

export default function PostKPICTA({ toolSlug }: PostKPICTAProps) {
  const toolConfig = affiliateData.tools[toolSlug as keyof typeof affiliateData.tools];
  if (!toolConfig) return null;

  const partner = affiliateData.partners[toolConfig.partner as keyof typeof affiliateData.partners];
  if (!partner) return null;

  const { postKpi } = toolConfig;

  return (
    <div className="w-full bg-[#1C2233] border border-[#1E2A3A] rounded-lg p-4 flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="text-white text-sm font-medium">
          {postKpi.icon} {postKpi.headline}
        </p>
        <p className="text-[#94A3B8] text-xs mt-0.5">{postKpi.subline}</p>
      </div>
      <a
        href={partner.url}
        target="_blank"
        rel="sponsored noopener"
        className="bg-[#3B82F6] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#2563EB] whitespace-nowrap flex-shrink-0 transition-colors"
      >
        {partner.tagline}
      </a>
    </div>
  );
}
