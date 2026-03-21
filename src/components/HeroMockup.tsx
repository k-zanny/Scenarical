'use client';

export default function HeroMockup() {
  return (
    <div className="mt-10 mx-auto max-w-[800px]">
      <div className="rounded-xl border border-surface-lighter bg-surface shadow-2xl shadow-accent/5 overflow-hidden">
        {/* Fake browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-background/50 border-b border-surface-lighter">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/40" />
            <div className="w-3 h-3 rounded-full bg-warning/40" />
            <div className="w-3 h-3 rounded-full bg-success/40" />
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-surface-light rounded-md px-3 py-1 text-xs text-muted text-center font-mono">
              scenarical.com/tools/roas-calculator
            </div>
          </div>
        </div>

        {/* Mockup content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: inputs mockup */}
            <div className="space-y-4">
              <div className="text-xs font-semibold text-label uppercase tracking-wider">Inputs</div>

              {/* Slider 1: animated */}
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Monthly Ad Spend</span>
                  <span className="font-mono text-foreground">$5,000</span>
                </div>
                <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-accent rounded-full animate-slider-demo" />
                </div>
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Revenue from Ads</span>
                  <span className="font-mono text-foreground">$15,000</span>
                </div>
                <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between text-[10px] text-muted mb-1">
                  <span>Conversion Rate</span>
                  <span className="font-mono text-foreground">3.5%</span>
                </div>
                <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              {/* Benchmark chip */}
              <div className="flex gap-1.5">
                <span className="text-[9px] text-accent/70 bg-accent/10 rounded-full px-2 py-0.5">
                  Google Ads avg: $2.69
                </span>
                <span className="text-[9px] text-label/50 bg-surface-lighter rounded-full px-2 py-0.5">
                  SaaS $3.80
                </span>
              </div>
            </div>

            {/* Right: results mockup */}
            <div className="space-y-3">
              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-success/5 border border-success/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-muted uppercase">ROAS</p>
                  <p className="font-mono text-sm font-bold text-success">3.00x</p>
                </div>
                <div className="bg-success/5 border border-success/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-muted uppercase">Net Profit</p>
                  <p className="font-mono text-sm font-bold text-success">$5.5K</p>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-muted uppercase">Proj. Rev</p>
                  <p className="font-mono text-sm font-bold text-accent">$15K</p>
                </div>
              </div>

              {/* Mini chart mockup */}
              <div className="bg-background/50 rounded-lg border border-surface-lighter p-3 h-24 flex items-end gap-0.5">
                {[30, 45, 38, 55, 48, 62, 58, 72, 65, 80, 75, 88].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-accent/30 rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              {/* Benchmark gauge */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #EF4444, #F59E0B, #10B981)' }}>
                  <div className="relative h-full">
                    <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2 border-success shadow-sm" style={{ left: '65%' }} />
                  </div>
                </div>
                <span className="text-[9px] text-success font-medium">Above avg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sliderDemo {
          0%, 100% { width: 40%; }
          50% { width: 70%; }
        }
        .animate-slider-demo {
          animation: sliderDemo 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
