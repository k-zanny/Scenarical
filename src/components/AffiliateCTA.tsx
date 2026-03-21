import affiliateLinks from '@/data/affiliate-links.json';

interface AffiliateCTAProps {
  toolSlug: string;
}

export default function AffiliateCTA({ toolSlug }: AffiliateCTAProps) {
  const link = affiliateLinks[toolSlug as keyof typeof affiliateLinks];
  if (!link) return null;

  return (
    <div className="mt-6 p-4 bg-surface rounded-xl border border-accent/20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-foreground font-medium">{link.cta}</p>
          <p className="text-xs text-label mt-0.5">{link.trial}</p>
        </div>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try {link.tool} Free →
        </a>
      </div>
      <div className="ad-slot mt-4" data-slot={toolSlug}></div>
    </div>
  );
}
