import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-surface-lighter mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold text-foreground">Scenarical</span>
            </div>
            <p className="text-sm text-label max-w-md">
              Scenarical — Where marketing math meets real-time intelligence.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Tools</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/tools/roas-calculator" className="text-xs text-label hover:text-foreground transition-colors">ROAS Calculator</Link>
              <Link href="/tools/ab-test-calculator" className="text-xs text-label hover:text-foreground transition-colors">A/B Test Calculator</Link>
              <Link href="/tools/email-roi-calculator" className="text-xs text-label hover:text-foreground transition-colors">Email ROI Calculator</Link>
              <Link href="/tools/llm-pricing-calculator" className="text-xs text-label hover:text-foreground transition-colors">LLM Pricing Calculator</Link>
            </nav>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-xs text-label hover:text-foreground transition-colors">About</Link>
              <Link href="/sitemap.xml" className="text-xs text-label hover:text-foreground transition-colors">Sitemap</Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-surface-lighter flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Scenarical. All rights reserved.
          </p>
          <p className="text-xs text-muted">
            Marketing decisions, powered by real data.
          </p>
        </div>
      </div>
    </footer>
  );
}
