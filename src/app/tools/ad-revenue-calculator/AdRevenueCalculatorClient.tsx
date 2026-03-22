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
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Standard vs Premium Advertising</h3>
          <p>
            Standard programmatic ads (served through networks like Google AdSense or AdX) typically
            earn ${benchmarks.website_ads.avg_rpm_display.toFixed(2)} RPM, while premium ad formats
            — direct-sold sponsorships, video ads, and native advertising — can command
            ${benchmarks.website_ads.avg_rpm_premium.toFixed(2)}+ RPM. The key to maximizing revenue
            is finding the right mix. Most successful publishers run 70-80% programmatic inventory
            as their baseline, supplemented by 20-30% premium placements that deliver outsized returns.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing Your Ad Revenue</h3>
          <p>
            The highest-impact optimization strategies focus on three areas. First, grow traffic
            through SEO and content marketing — ad revenue scales directly with pageviews. Second,
            optimize ad placement for viewability — above-the-fold and in-content placements
            consistently outperform sidebar and footer positions. Third, implement header bidding to
            increase competition for your inventory, which typically boosts RPM by 20-50%. For
            publishers with 50K+ monthly pageviews, transitioning from basic AdSense to a premium
            ad management platform can double or triple RPM. For data-driven strategies to grow your
            website traffic and ad revenue, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s SEO and content tools to attract more high-value visitors</a>.
          </p>
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
