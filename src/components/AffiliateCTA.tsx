import affiliateData from '@/data/affiliate-links.json';

interface AffiliateCTAProps {
  toolSlug: string;
}

export default function AffiliateCTA({ toolSlug }: AffiliateCTAProps) {
  const toolConfig = affiliateData.tools[toolSlug as keyof typeof affiliateData.tools];
  if (!toolConfig) return null;

  const partner = affiliateData.partners[toolConfig.partner as keyof typeof affiliateData.partners];
  if (!partner) return null;

  return (
    <div className="mt-6 p-4 bg-surface rounded-xl border border-accent/20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-foreground font-medium">{toolConfig.postKpi.headline}</p>
          <p className="text-xs text-label mt-0.5">{toolConfig.postKpi.subline}</p>
        </div>
        <a
          href={partner.url}
          target="_blank"
          rel="sponsored noopener"
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          {partner.tagline}
        </a>
      </div>
    </div>
  );
}
