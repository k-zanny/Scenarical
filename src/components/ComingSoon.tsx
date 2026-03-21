import Link from 'next/link';
import { getToolBySlug, getRelatedTools, tools } from '@/lib/tools-data';

const BUILT_SLUGS = [
  'roas-calculator', 'cpc-cpm-cpa-converter', 'ab-test-calculator',
  'email-roi-calculator', 'content-roi-calculator', 'ad-budget-planner',
  'landing-page-estimator',
];

interface ComingSoonProps {
  slug: string;
}

export default function ComingSoon({ slug }: ComingSoonProps) {
  const tool = getToolBySlug(slug);

  // Get related built tools, then fill from popular if < 3
  let related = getRelatedTools(slug).filter(t => BUILT_SLUGS.includes(t.slug));
  if (related.length < 3) {
    const fallback = tools
      .filter(t => BUILT_SLUGS.includes(t.slug) && t.slug !== slug && !related.find(r => r.slug === t.slug));
    related = [...related, ...fallback].slice(0, 3);
  }

  if (!tool) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <span className="text-5xl mb-6 block">{tool.icon}</span>
      <h1 className="text-3xl font-bold text-foreground mb-4">{tool.name}</h1>
      <p className="text-label mb-2 max-w-xl mx-auto">{tool.description}</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mt-4 mb-8">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Coming Soon
      </div>
      <p className="text-sm text-muted mb-8">
        This tool is under development. Subscribe to get notified when it launches.
      </p>

      <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mb-12" action="/api/subscribe" method="POST">
        <input type="hidden" name="tool" value={slug} />
        <input
          type="email"
          name="email"
          placeholder="your work email"
          required
          className="flex-1 bg-surface border border-surface-lighter rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Notify Me
        </button>
      </form>

      {related.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Try these tools now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            {related.slice(0, 4).map(t => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="p-4 bg-surface rounded-xl border border-surface-lighter hover:border-accent/30 transition-colors text-left"
              >
                <span className="text-xl">{t.icon}</span>
                <p className="text-sm font-semibold text-foreground mt-1">{t.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to all tools
        </Link>
      </div>
    </div>
  );
}
