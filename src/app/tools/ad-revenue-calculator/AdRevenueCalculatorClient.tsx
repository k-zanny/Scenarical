'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ScenarioSlider from '@/components/ScenarioSlider';
import KPICard from '@/components/KPICard';
import BenchmarkGauge from '@/components/BenchmarkGauge';
import RiskRadar from '@/components/RiskRadar';
import ActionPanel, { Action } from '@/components/ActionPanel';
import ShareButton from '@/components/ShareButton';
import RelatedTools from '@/components/RelatedTools';
import FAQSection from '@/components/FAQSection';
import FeedbackWidget from '@/components/FeedbackWidget';
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';
import { formatCurrency, formatNumber, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyPageviews: 50000,
  adsPerPage: 3,
  rpm: 5.00,
  fillRate: 85,
  viewability: 70,
  premiumAdPercent: 20,
  premiumRPM: 15.00,
};

type Inputs = typeof defaults;

interface Scenario {
  id: string;
  label: string;
  inputs: Inputs;
}

/* ================================================================== */
/*  FAQs                                                               */
/* ================================================================== */
const faqs = [
  {
    question: 'What is RPM and how is it calculated?',
    answer: 'RPM (Revenue Per Mille) is the revenue you earn per 1,000 pageviews or impressions. It is calculated as (Total Revenue / Total Pageviews) x 1,000. For example, if you earn $500 from 100,000 pageviews, your RPM is $5.00. RPM varies widely by niche — finance and insurance sites can see $20-50+ RPM, while entertainment sites may see $2-5. RPM is the single most important metric for comparing ad monetization performance.',
  },
  {
    question: 'What is a good fill rate and viewability score?',
    answer: 'A good fill rate is 85% or higher, meaning 85% of your ad slots are filled with paying ads. Top publishers achieve 95%+. Viewability measures the percentage of served ads that are actually seen by users — the industry standard is 70%, with premium publishers targeting 80%+. Both metrics directly impact revenue: a 10% improvement in viewability can increase revenue by 10-15% because advertisers pay more for viewable inventory.',
  },
  {
    question: 'How do I increase my website ad revenue?',
    answer: 'The highest-impact strategies are: (1) increase traffic through SEO and content marketing, (2) optimize ad placement for higher viewability, (3) implement header bidding to increase competition for your inventory, (4) add premium ad formats like video and native ads, (5) improve page load speed to reduce bounce rates, and (6) focus on high-RPM niches and content topics. Moving from standard display ads to a mix of premium and programmatic can increase RPM by 50-200%.',
  },
  {
    question: 'What is the difference between standard and premium ads?',
    answer: 'Standard display ads are served programmatically through ad networks like Google AdSense at market rates (typically $2-8 RPM). Premium ads include direct-sold sponsorships, video ads, native ads, and high-impact formats that command higher CPMs ($15-50+ RPM). Premium ads require more traffic and better content to attract direct advertisers, but they can dramatically increase revenue. Most publishers see the best results with a mix of 70-80% programmatic and 20-30% premium inventory.',
  },
  {
    question: 'How much does a 100k pageview website make from ads?',
    answer: 'A website with 100,000 monthly pageviews typically earns $300-$2,500 per month from display ads, depending on niche and ad setup. With a general-interest blog running AdSense at $3-5 RPM, expect $300-$500/month. A finance or insurance site with optimized header bidding at $15-25 RPM can earn $1,500-$2,500/month. The range is wide because RPM varies dramatically by niche, audience geography, and ad platform. Use this calculator with your actual RPM to get a precise estimate.',
  },
  {
    question: 'What is a good RPM for a niche site?',
    answer: 'A "good" RPM depends heavily on your niche. For general entertainment or lifestyle sites, $3-5 is decent. For technology and SaaS content, $8-15 is typical. Finance, insurance, and legal niches command the highest RPMs at $20-50+, because advertisers in those verticals have high customer lifetime values. Health and wellness sites average $10-20 RPM. If your RPM is below the average for your niche, focus on ad placement optimization, header bidding, and improving viewability before trying to increase traffic.',
  },
  {
    question: 'Can you make a living from website ads?',
    answer: 'Yes, but it requires significant traffic. To earn $5,000/month from ads alone, you need roughly 500,000-1,000,000 monthly pageviews at typical RPMs ($5-10), or 200,000-300,000 pageviews in a high-RPM niche like finance. Most full-time publishers diversify their income by combining ad revenue with affiliate marketing, sponsored content, digital products, and email list monetization. Ad revenue works best as a baseline income stream that grows predictably with traffic, supplemented by higher-margin revenue sources.',
  },
  {
    question: 'How long until ad revenue starts paying out?',
    answer: 'Most ad networks pay on a net-30 or net-60 basis, meaning you receive payment 30-60 days after the month ends. Google AdSense has a $100 minimum payout threshold and pays around the 21st of each month. Mediavine pays net-65 for the first 3 months, then net-30. Ezoic pays net-30 with a $20 minimum. For new sites, the bigger challenge is reaching the traffic thresholds required by premium networks — Mediavine requires 50,000 sessions/month, and AdThrive requires 100,000 pageviews/month.',
  },
  {
    question: 'Is AdSense still worth it in 2026?',
    answer: 'AdSense remains a solid starting point for sites with under 50,000 monthly pageviews, but it consistently underperforms compared to premium ad management platforms. AdSense typically delivers $2-5 RPM, while Ezoic can improve that by 50-100%, and Mediavine or AdThrive publishers regularly see $15-30+ RPM. The switch to premium platforms is one of the biggest single RPM improvements most publishers can make. If you have the traffic to qualify, switching away from AdSense is almost always the right move.',
  },
  {
    question: 'How does ad revenue differ between mobile and desktop?',
    answer: 'Desktop RPMs are typically 30-50% higher than mobile RPMs because desktop screens support larger, more visible ad formats and desktop users have higher purchase intent. However, mobile traffic accounts for 60-70% of total pageviews for most publishers, so mobile revenue often exceeds desktop in absolute terms. Smart publishers optimize both experiences — using sticky mobile ads, in-article units, and mobile-optimized anchor ads to close the RPM gap. Interstitial ads on mobile can boost RPM but hurt user experience if overused.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const effectiveImpressions = inp.monthlyPageviews * inp.adsPerPage * (inp.fillRate / 100) * (inp.viewability / 100);
  const standardImpressions = effectiveImpressions * (1 - inp.premiumAdPercent / 100);
  const premiumImpressions = effectiveImpressions * (inp.premiumAdPercent / 100);
  const standardRevenue = (standardImpressions / 1000) * inp.rpm;
  const premiumRevenue = (premiumImpressions / 1000) * inp.premiumRPM;
  const totalRevenue = standardRevenue + premiumRevenue;
  const annualRevenue = totalRevenue * 12;
  const revenuePerPageview = inp.monthlyPageviews > 0 ? totalRevenue / inp.monthlyPageviews : 0;
  const effectiveRPM = inp.monthlyPageviews > 0 ? (totalRevenue / inp.monthlyPageviews) * 1000 : 0;

  return { effectiveImpressions, standardImpressions, premiumImpressions, standardRevenue, premiumRevenue, totalRevenue, annualRevenue, revenuePerPageview, effectiveRPM };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function AdRevenueCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(5000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('ad-revenue-calculator');
    if (saved) {
      setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    }
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => {
      if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v);
    });
    if (Object.keys(urlInputs).length > 0) {
      setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    saveToLocalStorage('ad-revenue-calculator', inputs);
  }, [inputs]);

  const update = (key: keyof Inputs, value: number) => {
    setScenarios(prev => prev.map(s =>
      s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s
    ));
  };

  const resetDefaults = () => {
    setScenarios(prev => prev.map(s =>
      s.id === activeScenario ? { ...s, inputs: { ...defaults } } : s
    ));
  };

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    const nextId = String.fromCharCode(65 + scenarios.length);
    setScenarios(prev => [...prev, { id: nextId, label: `Scenario ${nextId}`, inputs: { ...inputs } }]);
    setActiveScenario(nextId);
  };

  const removeScenario = (id: string) => {
    if (id === 'A') return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    setActiveScenario('A');
  };

  // Metrics for each scenario
  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  const calcProfit = useCallback((inp: Record<string, number>) => {
    const effImpr = (inp.monthlyPageviews || 0) * (inp.adsPerPage || 0) * ((inp.fillRate || 0) / 100) * ((inp.viewability || 0) / 100);
    const stdImpr = effImpr * (1 - (inp.premiumAdPercent || 0) / 100);
    const premImpr = effImpr * ((inp.premiumAdPercent || 0) / 100);
    const stdRev = (stdImpr / 1000) * (inp.rpm || 0);
    const premRev = (premImpr / 1000) * (inp.premiumRPM || 0);
    return stdRev + premRev;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Increase pageviews
    const revenuePerPV = m.revenuePerPageview > 0 ? m.revenuePerPageview : 0.001;
    const neededPageviews = Math.ceil(goalRevenue / revenuePerPV);
    results.push({
      label: 'Increase Traffic',
      description: `Grow to ${formatNumber(neededPageviews)} monthly pageviews`,
      change: inputs.monthlyPageviews > 0 ? ((neededPageviews - inputs.monthlyPageviews) / inputs.monthlyPageviews) * 100 : 0,
    });
    // Path 2: Increase RPM
    const currentEffImpr = inputs.monthlyPageviews * inputs.adsPerPage * (inputs.fillRate / 100) * (inputs.viewability / 100);
    const stdFraction = 1 - inputs.premiumAdPercent / 100;
    const premFraction = inputs.premiumAdPercent / 100;
    // Solve: goalRevenue = (effImpr * stdFraction / 1000) * neededRPM + (effImpr * premFraction / 1000) * premiumRPM
    const premiumRev = (currentEffImpr * premFraction / 1000) * inputs.premiumRPM;
    const neededStdRevenue = goalRevenue - premiumRev;
    const stdImprThousands = currentEffImpr * stdFraction / 1000;
    const neededRPM = stdImprThousands > 0 ? neededStdRevenue / stdImprThousands : 0;
    results.push({
      label: 'Increase Standard RPM',
      description: `Raise RPM to $${Math.max(0, neededRPM).toFixed(2)}`,
      change: inputs.rpm > 0 ? ((Math.max(0, neededRPM) - inputs.rpm) / inputs.rpm) * 100 : 0,
    });
    // Path 3: Increase premium percentage
    // Solve: goalRevenue = (effImpr * (1-p) / 1000) * rpm + (effImpr * p / 1000) * premiumRPM
    // goalRevenue = effImpr/1000 * ((1-p)*rpm + p*premiumRPM)
    // goalRevenue = effImpr/1000 * (rpm - p*rpm + p*premiumRPM)
    // goalRevenue = effImpr/1000 * (rpm + p*(premiumRPM - rpm))
    const effImprK = currentEffImpr / 1000;
    const neededP = effImprK > 0 && inputs.premiumRPM !== inputs.rpm
      ? ((goalRevenue / effImprK) - inputs.rpm) / (inputs.premiumRPM - inputs.rpm) * 100
      : inputs.premiumAdPercent;
    results.push({
      label: 'Increase Premium Ad Share',
      description: `Grow premium ads to ${Math.min(100, Math.max(0, neededP)).toFixed(0)}% of inventory`,
      change: inputs.premiumAdPercent > 0 ? ((Math.min(100, Math.max(0, neededP)) - inputs.premiumAdPercent) / inputs.premiumAdPercent) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — standard vs premium revenue
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Standard Ad Revenue', 'Premium Ad Revenue'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.standardRevenue, s.metrics.premiumRevenue],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}80`,
      ],
      borderColor: scenarioColors[idx],
      borderWidth: 1,
      borderRadius: 6,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: scenarios.length > 1,
        labels: { color: '#94A3B8', font: { family: 'var(--font-dm-sans)', size: 11 } },
      },
      tooltip: {
        backgroundColor: '#141926',
        borderColor: '#283044',
        borderWidth: 1,
        titleColor: '#E8ECF4',
        bodyColor: '#94A3B8',
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const v = ctx.raw as number;
            return `${ctx.dataset.label}: ${formatCurrency(v)}/mo`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8' },
      },
      y: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => `$${Number(v).toLocaleString()}`,
        },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.totalRevenue < 100) {
      return {
        status: 'danger',
        title: `Monthly revenue of ${formatCurrency(m.totalRevenue)} — focus on growing traffic first.`,
        actions: [
          {
            icon: '📈',
            text: 'Prioritize content and SEO to grow pageviews — ad revenue scales linearly with traffic.',
            affiliateText: 'Grow your organic traffic with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🔍', text: 'Target high-RPM content topics like finance, technology, and health to maximize per-pageview revenue.', link: '/tools/keyword-difficulty-estimator' },
          { icon: '⚡', text: 'Improve page load speed and Core Web Vitals to reduce bounce rates and increase pageviews per session.' },
        ],
      };
    }
    if (m.totalRevenue < 1000) {
      return {
        status: 'warning',
        title: `Monthly revenue of ${formatCurrency(m.totalRevenue)} — optimize ad placement and RPM.`,
        actions: [
          { icon: '🎯', text: 'Implement header bidding to increase competition for your inventory and boost RPM by 20-50%.' },
          {
            icon: '📊',
            text: 'Test ad placements — above-the-fold and in-content ads typically deliver 2-3x higher viewability.',
            affiliateText: 'Find high-traffic keywords with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🎬', text: 'Add video ad units — video RPM averages $20+, 4x higher than standard display.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    if (m.totalRevenue < 5000) {
      return {
        status: 'good',
        title: `Monthly revenue of ${formatCurrency(m.totalRevenue)} — strong performance with room to optimize.`,
        actions: [
          { icon: '💎', text: 'Pursue direct ad deals — premium advertisers pay 2-5x programmatic rates for guaranteed placements.' },
          {
            icon: '📈',
            text: 'Scale content production to grow pageviews — at your current RPM, every 10K pageviews adds significant revenue.',
            affiliateText: 'Scale your content strategy with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🔄', text: 'A/B test ad density (2 vs 3 vs 4 ads per page) to find the revenue-optimal balance.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Monthly revenue of ${formatCurrency(m.totalRevenue)} — excellent monetization performance.`,
      actions: [
        {
          icon: '🚀',
          text: 'Diversify revenue streams — add affiliate marketing, sponsored content, and lead generation alongside ads.',
          affiliateText: 'Discover monetization opportunities with Semrush → Try Free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Expand to international traffic sources — different geos have different RPMs. Target high-value markets.' },
        { icon: '📱', text: 'Optimize mobile ad experience — mobile traffic often accounts for 60%+ of pageviews but lower RPM.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Website Ad Revenue Calculator</h1>
        <p className="text-label max-w-2xl">
          Estimate your website&apos;s advertising revenue based on pageviews, ad density,
          RPM, fill rate, and viewability. Model standard vs premium ad inventory to
          optimize your monetization strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============ INPUT PANEL ============ */}
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          {/* Scenario tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  activeScenario === s.id
                    ? 'bg-accent text-white'
                    : 'text-label hover:text-foreground'
                }`}
              >
                {s.label}
                {s.id !== 'A' && (
                  <span
                    onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }}
                    className="ml-1.5 text-white/60 hover:text-white"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {scenarios.length < 3 && (
              <button
                onClick={addScenario}
                className="text-sm text-accent hover:text-accent-hover px-3 py-1.5 border border-accent/30 rounded-lg transition-colors"
              >
                + Add Scenario {String.fromCharCode(65 + scenarios.length)}
              </button>
            )}
            <button
              onClick={resetDefaults}
              className="text-xs text-muted hover:text-label transition-colors ml-auto"
            >
              Reset
            </button>
          </div>

          {/* Basic Inputs */}
          <ScenarioSlider
            label="Monthly Pageviews"
            value={inputs.monthlyPageviews}
            min={1000}
            max={10000000}
            step={1000}
            onChange={(v) => update('monthlyPageviews', v)}
            benchmarkChips={[
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
              { label: '500K', value: 500000 },
              { label: '1M', value: 1000000 },
            ]}
          />
          <ScenarioSlider
            label="Ads per Page"
            value={inputs.adsPerPage}
            min={1}
            max={8}
            step={1}
            benchmark={benchmarks.website_ads.avg_ads_per_page}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('adsPerPage', v)}
          />
          <ScenarioSlider
            label="Standard RPM ($)"
            value={inputs.rpm}
            min={0.50}
            max={50}
            step={0.25}
            prefix="$"
            benchmark={benchmarks.website_ads.avg_rpm_display}
            benchmarkLabel="Avg display RPM"
            onChange={(v) => update('rpm', v)}
          />

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider
                label="Fill Rate"
                value={inputs.fillRate}
                min={10}
                max={100}
                step={1}
                suffix="%"
                benchmark={benchmarks.website_ads.avg_fill_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('fillRate', v)}
              />
              <ScenarioSlider
                label="Viewability"
                value={inputs.viewability}
                min={10}
                max={100}
                step={1}
                suffix="%"
                benchmark={benchmarks.website_ads.avg_viewability}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('viewability', v)}
              />
              <ScenarioSlider
                label="Premium Ad Share"
                value={inputs.premiumAdPercent}
                min={0}
                max={100}
                step={1}
                suffix="%"
                onChange={(v) => update('premiumAdPercent', v)}
                benchmarkChips={[
                  { label: 'None 0%', value: 0 },
                  { label: 'Low 10%', value: 10 },
                  { label: 'Med 25%', value: 25 },
                  { label: 'High 50%', value: 50 },
                ]}
              />
              <ScenarioSlider
                label="Premium RPM ($)"
                value={inputs.premiumRPM}
                min={1}
                max={100}
                step={0.50}
                prefix="$"
                benchmark={benchmarks.website_ads.avg_rpm_premium}
                benchmarkLabel="Avg premium RPM"
                onChange={(v) => update('premiumRPM', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Monthly Ad Revenue"
                value={formatCurrency(m.totalRevenue)}
                subtitle={`${formatNumber(Math.round(m.effectiveImpressions))} effective impressions`}
                color={m.totalRevenue >= 5000 ? 'green' : m.totalRevenue >= 1000 ? 'amber' : 'blue'}
              />
              <KPICard
                title="Effective RPM"
                value={`$${m.effectiveRPM.toFixed(2)}`}
                subtitle={`$${m.revenuePerPageview.toFixed(4)} per pageview`}
                color={m.effectiveRPM >= benchmarks.website_ads.avg_rpm_display ? 'green' : 'amber'}
              />
              <KPICard
                title="Annual Revenue"
                value={formatCurrency(m.annualRevenue)}
                subtitle={`${formatCurrency(m.standardRevenue)}/mo std + ${formatCurrency(m.premiumRevenue)}/mo prem`}
                color={m.annualRevenue >= 60000 ? 'green' : m.annualRevenue >= 12000 ? 'amber' : 'blue'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>
                    {s.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Monthly Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.totalRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Effective RPM</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        ${s.metrics.effectiveRPM.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Annual Revenue</p>
                      <p className="font-mono text-lg font-bold text-success">
                        {formatCurrency(s.metrics.annualRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="ad-revenue-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Standard vs Premium Ad Revenue</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your RPM vs Industry Average"
            value={m.effectiveRPM}
            benchmark={benchmarks.website_ads.avg_rpm_display}
            min={0}
            max={30}
            suffix=""
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Grow your traffic to increase ad revenue"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="ad-revenue-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Revenue — How to reach your monthly goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Ad Revenue</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalRevenue}
                onChange={(e) => setGoalRevenue(parseFloat(e.target.value) || 0)}
                className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}
              >
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Smallest change needed</span>}
                <h4 className="text-sm font-semibold text-foreground mt-1">{scenario.label}</h4>
                <p className="text-xs text-label mt-1">{scenario.description}</p>
                <p className="text-xs font-mono mt-2 text-label">
                  Change: <span className={scenario.change > 0 ? 'text-danger' : 'text-success'}>
                    {scenario.change > 0 ? '+' : ''}{scenario.change.toFixed(1)}%
                  </span>
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setIsReverse(false)}
            className="mt-4 text-xs text-muted hover:text-label"
          >
            Close reverse mode
          </button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={{
          monthlyPageviews: 'Monthly Pageviews',
          adsPerPage: 'Ads per Page',
          rpm: 'Standard RPM',
          fillRate: 'Fill Rate',
          viewability: 'Viewability',
          premiumAdPercent: 'Premium Ad %',
          premiumRPM: 'Premium RPM',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly revenue"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Website Ad Revenue</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Advertising revenue is one of the most common monetization strategies for content
            websites, blogs, and online publishers. Whether you use Google AdSense, programmatic
            ad networks, or direct-sold sponsorships, understanding the key metrics that drive ad
            revenue — pageviews, RPM, fill rate, and viewability — is essential to maximizing
            your earnings. This calculator models both standard display and premium ad inventory
            to give you an accurate picture of your revenue potential.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Much Can a Website Earn from Ads in 2026?</h3>
          <p>
            Website ad revenue in 2026 ranges from pocket change to six-figure annual income, depending
            on three core variables: traffic volume, niche, and ad optimization. A small blog with
            10,000 monthly pageviews running basic AdSense might earn $30-$50 per month. Scale that
            to 100,000 pageviews with optimized header bidding in a high-RPM niche like personal
            finance, and monthly earnings can reach $1,500-$2,500. At 1 million pageviews, publishers
            routinely earn $5,000-$25,000+ per month.
          </p>
          <p>
            The ad market in 2026 continues to shift toward programmatic buying, with global digital ad
            spending projected to exceed $740 billion. Privacy regulations like GDPR and the
            deprecation of third-party cookies have pushed RPMs down for non-consented traffic
            by 30-50%, making first-party data and contextual targeting more valuable than ever.
            Publishers who have invested in building email lists and logged-in user bases are seeing
            significantly higher CPMs than those relying on anonymous traffic. Use our{' '}
            <a href="/tools/email-roi-calculator" className="text-accent hover:underline">Email ROI Calculator</a>{' '}
            to estimate how building an email list alongside ads can compound your revenue.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Average Ad Revenue by Niche</h3>
          <p>
            RPM varies dramatically by niche because advertisers pay based on the value of each visitor.
            Here are typical 2026 RPM ranges by vertical:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Finance &amp; Insurance:</strong> $25-$50+ RPM. The highest-paying niche because a single lead can be worth hundreds of dollars to advertisers. Credit cards, mortgages, and insurance keywords drive premium CPMs.</li>
            <li><strong>Legal:</strong> $20-$45 RPM. Personal injury, immigration, and business law content attracts high-value advertisers with large client acquisition budgets.</li>
            <li><strong>Health &amp; Wellness:</strong> $10-$25 RPM. Medical, fitness, and supplement advertisers pay well, especially for content targeting specific conditions or treatments.</li>
            <li><strong>Technology &amp; SaaS:</strong> $8-$20 RPM. B2B software companies are willing to pay premium CPMs to reach decision-makers reading tech content.</li>
            <li><strong>Home &amp; Garden:</strong> $8-$15 RPM. Seasonal peaks around spring and fall drive higher rates, with home improvement advertisers leading spend.</li>
            <li><strong>Travel:</strong> $6-$15 RPM. Highly seasonal, with Q4 and summer seeing peak rates. Luxury travel content commands the highest CPMs.</li>
            <li><strong>Food &amp; Recipes:</strong> $5-$12 RPM. High-volume niche with strong video ad potential. Recipe sites with video see 2-3x higher RPMs than text-only.</li>
            <li><strong>Entertainment &amp; Gaming:</strong> $2-$8 RPM. High traffic potential but lower advertiser value per visitor. Volume makes up for lower RPMs.</li>
            <li><strong>News &amp; Current Events:</strong> $3-$8 RPM. Volatile RPMs tied to advertiser brand safety concerns. Political content often gets lower fill rates.</li>
          </ul>
          <p>
            To understand how much your existing traffic is worth even before placing ads, try our{' '}
            <a href="/tools/traffic-value-calculator" className="text-accent hover:underline">Traffic Value Calculator</a>.
            For targeting the most profitable keywords in your niche, the{' '}
            <a href="/tools/keyword-difficulty-estimator" className="text-accent hover:underline">Keyword Difficulty Estimator</a>{' '}
            helps you find the right balance of search volume and competition.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Display Ads vs. Native Ads vs. Video Ads</h3>
          <p>
            Not all ad formats perform equally. Understanding the trade-offs between display, native,
            and video ads helps you build an optimal monetization stack:
          </p>
          <p>
            <strong>Display ads</strong> (banners, leaderboards, rectangles) are the bread and butter
            of programmatic advertising. They are easiest to implement and available through every ad
            network. Typical RPM: $2-$8 for standard programmatic, $8-$15 with header bidding.
            Display ads work best above the fold and within content. The downside is ad blindness —
            users have learned to ignore banners, and viewability rates for sidebar placements can
            drop below 30%.
          </p>
          <p>
            <strong>Native ads</strong> blend into your content layout, appearing as recommended
            articles or in-feed content. Networks like Taboola and Outbrain serve native ads with
            typical RPMs of $4-$12. Native ads generally see 2x higher click-through rates than
            display because they match the look and feel of editorial content. They work particularly
            well on news sites and content-heavy blogs. The trade-off is that aggressive native ad
            placements can erode reader trust if the sponsored content is low quality.
          </p>
          <p>
            <strong>Video ads</strong> deliver the highest RPMs — $15-$40+ — because video captures
            attention and advertisers pay a premium for engaged viewers. In-article video players
            (like those from Mediavine or Raptive) auto-play muted videos with overlay ads. Pre-roll
            video ads on your own video content earn the most. The challenge is that video ads increase
            page load time and consume more bandwidth, which can hurt Core Web Vitals and mobile
            experience. Publishers who create original video content see the highest returns.
          </p>
          <p>
            The best-performing publishers use all three formats strategically: display for baseline
            revenue, native for in-feed monetization, and video for premium RPM uplift. To measure
            which content formats deliver the best return on your time investment, use our{' '}
            <a href="/tools/content-roi-calculator" className="text-accent hover:underline">Content ROI Calculator</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Ezoic vs. AdSense vs. Mediavine: Platform Comparison</h3>
          <p>
            Choosing the right ad platform is one of the highest-leverage decisions a publisher can
            make. Here is how the three most popular platforms compare in 2026:
          </p>
          <p>
            <strong>Google AdSense</strong> is the default starting point. No traffic minimum, easy
            setup, and global advertiser demand. However, AdSense consistently delivers the lowest
            RPMs ($2-$5) because it runs a single auction without header bidding competition.
            AdSense is best for sites under 10,000 monthly pageviews that do not qualify for
            premium networks. Revenue share is 68% to the publisher.
          </p>
          <p>
            <strong>Ezoic</strong> uses machine learning to optimize ad placements and serves as a
            header bidding platform. No strict traffic minimum (though performance improves above
            10,000 monthly visits). Ezoic typically delivers 50-100% higher RPMs than AdSense
            ($4-$12 RPM). The platform offers a free tier (Access Now) with an Ezoic-branded ad
            displayed on your site, or a premium tier without branding. Ezoic is the best option
            for growing sites in the 10K-50K pageview range.
          </p>
          <p>
            <strong>Mediavine</strong> (now part of Raptive for sites over 100K sessions) requires
            50,000 sessions per month minimum. In return, publishers see significant RPM improvements —
            $15-$30+ RPM is common. Mediavine handles all ad optimization, layout testing, and header
            bidding. Revenue share is 75% to the publisher, increasing to 80% at higher traffic tiers.
            For publishers who qualify, Mediavine or Raptive represents the gold standard in ad
            management and typically delivers 3-5x the revenue of AdSense.
          </p>
          <p>
            The platform switch path for most publishers is: AdSense (0-10K pageviews) → Ezoic
            (10K-50K) → Mediavine/Raptive (50K+). Each transition typically delivers a 50-100%
            RPM increase. To calculate whether investing in SEO to reach those traffic thresholds
            is worth it, check our{' '}
            <a href="/tools/seo-roi-calculator" className="text-accent hover:underline">SEO ROI Calculator</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Metrics That Drive Ad Revenue</h3>
          <p>
            The fundamental formula for ad revenue is simple: Revenue = (Impressions / 1,000) x RPM.
            But the real-world calculation involves several layers. First, your monthly pageviews
            multiplied by ads per page gives you total ad slots. Then, fill rate determines what
            percentage of those slots are filled with paying ads (industry average is {benchmarks.website_ads.avg_fill_rate}%).
            Finally, viewability measures what percentage of served ads are actually seen by users
            (industry average is {benchmarks.website_ads.avg_viewability}%). Each of these metrics
            compounds — improving any one by 10% can meaningfully boost revenue. To grow the organic
            traffic that powers your ad revenue, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides keyword research and SEO tools to help you increase pageviews</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Increase Your Ad Revenue (10 Proven Strategies)</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Implement header bidding.</strong> Replace waterfall ad serving with header bidding to let multiple demand sources compete simultaneously. Publishers switching to header bidding see 20-50% RPM increases on average.</li>
            <li><strong>Optimize ad placement.</strong> Above-the-fold placements, in-content units after the second paragraph, and sticky sidebar ads consistently deliver the highest viewability. Test each position with your audience.</li>
            <li><strong>Add video ad units.</strong> Even if you do not create video content, in-article video players with contextual ads can add $5-$15 RPM on top of your display revenue.</li>
            <li><strong>Improve page speed.</strong> Every second of load time reduces pageviews by 11% and ad viewability by 7%. Optimize images, defer non-critical scripts, and use a CDN. Fast sites keep users browsing longer, increasing pages per session.</li>
            <li><strong>Grow pages per session.</strong> Internal linking, recommended content widgets, and series-based content encourage users to view more pages, directly multiplying your ad impressions without requiring new traffic.</li>
            <li><strong>Target high-RPM keywords.</strong> Create content around topics with expensive CPC keywords — advertisers who bid $20+ per click in search also pay premium CPMs on display. Use our <a href="/tools/cpc-cpm-cpa-converter" className="text-accent hover:underline">CPC/CPM/CPA Converter</a> to translate between pricing models.</li>
            <li><strong>Upgrade your ad platform.</strong> The single biggest RPM improvement most publishers can make is switching from AdSense to Ezoic, Mediavine, or Raptive. This alone can double or triple revenue with the same traffic.</li>
            <li><strong>Build first-party data.</strong> Collect emails, encourage account creation, and use surveys to build audience segments. First-party data lets you sell targeted inventory at premium rates in a cookieless world.</li>
            <li><strong>Optimize for mobile.</strong> With 60-70% of traffic on mobile, small improvements to mobile ad layouts compound. Use sticky anchor ads, optimize in-article placements for thumb-scroll behavior, and test interstitial frequency.</li>
            <li><strong>Diversify traffic sources.</strong> Over-reliance on a single traffic source is risky. A Google algorithm update can cut organic traffic overnight. Build email, social, and direct traffic channels to stabilize your ad revenue base. See our <a href="/tools/newsletter-value-calculator" className="text-accent hover:underline">Newsletter Value Calculator</a> to estimate the worth of building a subscriber base.</li>
          </ol>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Common Mistakes That Tank Your RPM</h3>
          <p>
            Even experienced publishers make mistakes that silently erode their ad revenue. Here are
            the most damaging ones:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Too many ads per page.</strong> More ads does not always mean more revenue. Past 4-5 ads per page, viewability drops, page speed suffers, and user experience degrades — all of which lower RPM. Many publishers find their revenue-optimal point is 3-4 well-placed ads rather than 6-8 poorly placed ones.</li>
            <li><strong>Ignoring Core Web Vitals.</strong> Google uses Core Web Vitals as a ranking factor. Heavy ad scripts that cause layout shift (CLS) and slow down Largest Contentful Paint (LCP) push your pages down in search results, reducing organic traffic — the very traffic that feeds your ad revenue.</li>
            <li><strong>Not testing ad layouts.</strong> Running the same ad layout for months without testing is leaving money on the table. A/B test ad positions, sizes, and density regularly. Our <a href="/tools/ab-test-calculator" className="text-accent hover:underline">A/B Test Calculator</a> can help you determine the right sample size for statistically valid ad layout tests.</li>
            <li><strong>Neglecting ad refresh.</strong> For pages with long session durations (recipes, tutorials, tools), implementing viewable ad refresh every 30-60 seconds can increase impressions by 30-50% without requiring more traffic.</li>
            <li><strong>Poor geographic targeting.</strong> US and UK traffic earns 3-10x more than traffic from developing countries. If your content attracts global traffic, consider geo-targeting your highest-value content to maximize RPM from tier-1 countries.</li>
            <li><strong>Selling direct without data.</strong> Negotiating direct ad deals without solid traffic data and audience demographics leads to underpricing your inventory. Use analytics to prove your audience value before approaching advertisers.</li>
          </ul>
          <p>
            To understand the true return on your advertising and content investment, pair this
            calculator with our{' '}
            <a href="/tools/roas-calculator" className="text-accent hover:underline">ROAS Calculator</a>{' '}
            for the advertiser perspective, or the{' '}
            <a href="/tools/content-roi-calculator" className="text-accent hover:underline">Content ROI Calculator</a>{' '}
            to measure which content drives the most ad revenue per dollar spent creating it.
          </p>
        </div>
      </div>

      {/* Related Calculators */}
      <div className="mt-10 max-w-3xl">
        <h3 className="text-lg font-semibold text-foreground mb-3">Related Calculators</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/tools/traffic-value-calculator" className="block bg-surface rounded-lg border border-surface-lighter p-4 hover:border-accent/50 transition-colors">
            <p className="font-medium text-foreground text-sm">Traffic Value Calculator</p>
            <p className="text-xs text-label mt-1">Estimate the dollar value of your organic search traffic based on keyword rankings and CPC data.</p>
          </a>
          <a href="/tools/seo-roi-calculator" className="block bg-surface rounded-lg border border-surface-lighter p-4 hover:border-accent/50 transition-colors">
            <p className="font-medium text-foreground text-sm">SEO ROI Calculator</p>
            <p className="text-xs text-label mt-1">Calculate the return on investment from your SEO efforts, including content creation and link building costs.</p>
          </a>
          <a href="/tools/keyword-difficulty-estimator" className="block bg-surface rounded-lg border border-surface-lighter p-4 hover:border-accent/50 transition-colors">
            <p className="font-medium text-foreground text-sm">Keyword Difficulty Estimator</p>
            <p className="text-xs text-label mt-1">Assess how hard it is to rank for target keywords and find opportunities with high traffic potential.</p>
          </a>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="ad-revenue-calculator" />
      <PreRelatedCTA toolSlug="ad-revenue-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="ad-revenue-calculator" />
    </div>
  );
}
