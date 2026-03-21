import Link from 'next/link';
import ToolCategoryTabs from '@/components/ToolCategoryTabs';
import HeroMockup from '@/components/HeroMockup';
import FeedbackWidget from '@/components/FeedbackWidget';
import { tools } from '@/lib/tools-data';

const featuredTools = [
  {
    slug: 'roas-calculator',
    name: 'ROAS Calculator',
    why: 'The #1 metric every paid marketer tracks. See your true profitability instantly.',
    icon: '📊',
  },
  {
    slug: 'ab-test-calculator',
    name: 'A/B Test Calculator',
    why: 'Stop guessing when to end your test. Get the exact sample size you need.',
    icon: '🧪',
  },
  {
    slug: 'freelance-rate-calculator',
    name: 'Freelance Rate Calculator',
    why: 'Pricing yourself wrong costs thousands. Find your true market rate.',
    icon: '💼',
  },
  {
    slug: 'llm-pricing-calculator',
    name: 'LLM Pricing Calculator',
    why: 'API costs add up fast. Compare providers before you commit.',
    icon: '🤖',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
              Marketing decisions,{' '}
              <span className="text-accent">powered by real data.</span>
            </h1>
            <p className="text-base sm:text-lg text-label mb-2">
              Your numbers. Your scenarios. Updated in real time.
            </p>
            <p className="text-sm text-muted mb-6">
              Don&apos;t just calculate. Simulate, compare, decide.
            </p>
            <Link
              href="#tools"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white text-lg font-semibold rounded-xl transition-colors shadow-lg shadow-accent/20"
            >
              Explore {tools.length}+ Free Tools
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
          </div>

          {/* Product Mockup */}
          <HeroMockup />
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 border-t border-surface-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-6 rounded-xl bg-surface border border-surface-lighter">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Scenario Planning, Not Just Math</h3>
              <p className="text-sm text-label">
                Stop guessing your ad budget. See exactly where your break-even is.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-surface border border-surface-lighter">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">You vs. Industry Benchmarks</h3>
              <p className="text-sm text-label">
                Is your ROAS actually good? Compare against 5 industry averages instantly.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-surface border border-surface-lighter">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Share With Your Team</h3>
              <p className="text-sm text-label">
                No more spreadsheet screenshots. Share a live link your team can interact with.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center">Most Popular</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-16">
            {featuredTools.map(tool => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group relative p-6 bg-surface rounded-xl border border-surface-lighter hover:border-accent/30 transition-all hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{tool.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors mb-1">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-label">{tool.why}</p>
                  </div>
                </div>
                {/* Mini preview placeholder */}
                <div className="mt-4 h-16 rounded-lg bg-background/50 border border-surface-lighter flex items-center justify-center overflow-hidden">
                  <div className="flex gap-3 items-end px-4 w-full">
                    <div className="h-8 w-1/5 bg-accent/20 rounded-t" />
                    <div className="h-12 w-1/5 bg-accent/30 rounded-t" />
                    <div className="h-6 w-1/5 bg-accent/15 rounded-t" />
                    <div className="h-10 w-1/5 bg-success/20 rounded-t" />
                    <div className="h-14 w-1/5 bg-accent/40 rounded-t" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Open tool <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Tools Section */}
      <section id="tools" className="py-12 sm:py-16 border-t border-surface-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Explore all {tools.length} free tools
            </h2>
            <p className="text-base text-label max-w-2xl mx-auto">
              Explore multiple scenarios with live benchmarks, saved history, and shareable reports — all in one place.
            </p>
          </div>

          <ToolCategoryTabs />
        </div>
      </section>

      {/* Feedback */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeedbackWidget />
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-12 sm:py-16 border-t border-surface-lighter">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Get weekly benchmark updates + new tool alerts</h2>
          <p className="text-sm text-label mb-6">
            Know when industry averages shift — before your competitors do.
          </p>
          <form className="flex flex-col sm:flex-row gap-2" action="/api/subscribe" method="POST">
            <input
              type="email"
              name="email"
              placeholder="your work email"
              required
              className="flex-1 bg-surface border border-surface-lighter rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none min-h-[44px]"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
