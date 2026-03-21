import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Scenarical',
  description: 'About Scenarical — the marketing decision platform powered by real data.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-foreground mb-6">About Scenarical</h1>
      <div className="prose prose-invert max-w-none space-y-4 text-label">
        <p>
          Scenarical is an interactive marketing decision platform built for digital marketers,
          freelancers, and growth teams who need more than simple calculators.
        </p>
        <p>
          Every tool lets you drag sliders to compare multiple scenarios in real time, see how
          your metrics stack up against industry benchmarks, and share your analysis with your
          team via unique URLs.
        </p>
        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Disclaimer</h2>
        <p>
          All calculations are estimates based on industry averages and the inputs you provide.
          Actual results may vary. Scenarical does not provide financial, legal, or professional
          advice. Always consult with qualified professionals before making business decisions.
        </p>
        <p>
          Benchmark data is sourced from publicly available industry reports and is updated
          regularly. While we strive for accuracy, we cannot guarantee that all benchmark
          figures are current or applicable to your specific situation.
        </p>
      </div>
    </div>
  );
}
