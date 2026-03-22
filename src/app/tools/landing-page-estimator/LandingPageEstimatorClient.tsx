'use client';

import { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
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
import { formatCurrency, formatPercent, formatNumber, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyVisitors: 10000,
  conversionRate: 5.89,
  avgOrderValue: 75,
  costPerVisitor: 2.50,
  bounceRate: 60,
  monthlyFixedCosts: 1000,
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
    question: 'What is a good landing page conversion rate?',
    answer: 'The average landing page conversion rate across industries is about 5.89%. A good conversion rate is above 11.45%, and top-performing landing pages convert at 27% or higher. Your ideal rate depends on your industry, traffic source, and offer type. Use the benchmark gauge in this tool to see where you stand.',
  },
  {
    question: 'How does bounce rate affect landing page revenue?',
    answer: 'Bounce rate directly reduces the number of visitors who have a chance to convert. If 60% of visitors bounce, only 40% remain to engage with your offer. Reducing bounce rate from 60% to 40% effectively increases your converting audience by 50%, which can dramatically improve revenue without increasing ad spend.',
  },
  {
    question: 'What is the difference between conversion rate and effective conversion rate?',
    answer: 'Conversion rate is typically measured against all visitors who land on the page. However, visitors who bounce immediately never truly engage with your offer. Effective conversion rate considers only the visitors who stay on your page (non-bouncers), giving you a more accurate picture of how persuasive your page actually is.',
  },
  {
    question: 'How can I improve my landing page conversion rate?',
    answer: 'Focus on five key areas: (1) match your headline to the ad or link that brought visitors to the page, (2) use a clear, single call-to-action, (3) add social proof like testimonials and trust badges, (4) optimize page load speed — every second of delay reduces conversions by up to 7%, and (5) A/B test different versions systematically.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const effectiveVisitors = inp.monthlyVisitors * (1 - inp.bounceRate / 100);
  const conversions = effectiveVisitors * inp.conversionRate / 100;
  const revenue = conversions * inp.avgOrderValue;
  const trafficCost = inp.monthlyVisitors * inp.costPerVisitor;
  const totalCosts = trafficCost + inp.monthlyFixedCosts;
  const profit = revenue - totalCosts;
  const revenuePerVisitor = inp.monthlyVisitors > 0 ? revenue / inp.monthlyVisitors : 0;
  return { effectiveVisitors, conversions, revenue, trafficCost, totalCosts, profit, revenuePerVisitor };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function LandingPageEstimatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(25000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('landing-page-estimator');
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
    saveToLocalStorage('landing-page-estimator', inputs);
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
    const eff = (inp.monthlyVisitors || 0) * (1 - (inp.bounceRate || 0) / 100);
    const conv = eff * (inp.conversionRate || 0) / 100;
    const rev = conv * (inp.avgOrderValue || 0);
    const cost = (inp.monthlyVisitors || 0) * (inp.costPerVisitor || 0) + (inp.monthlyFixedCosts || 0);
    return rev - cost;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const scenarios = [];
    // Path 1: Increase visitors
    const neededEffective = inputs.conversionRate > 0 && inputs.avgOrderValue > 0
      ? goalRevenue / (inputs.conversionRate / 100) / inputs.avgOrderValue
      : 0;
    const neededVisitors = inputs.bounceRate < 100
      ? neededEffective / (1 - inputs.bounceRate / 100)
      : 0;
    scenarios.push({
      label: 'Increase Visitors',
      description: `Monthly visitors to ${formatNumber(Math.ceil(neededVisitors))}`,
      change: inputs.monthlyVisitors > 0 ? ((neededVisitors - inputs.monthlyVisitors) / inputs.monthlyVisitors) * 100 : 0,
    });
    // Path 2: Increase conversion rate
    const neededConvRate = m.effectiveVisitors > 0 && inputs.avgOrderValue > 0
      ? (goalRevenue / m.effectiveVisitors / inputs.avgOrderValue) * 100
      : 0;
    scenarios.push({
      label: 'Increase Conversion Rate',
      description: `Conversion rate to ${formatPercent(neededConvRate)}`,
      change: inputs.conversionRate > 0 ? ((neededConvRate - inputs.conversionRate) / inputs.conversionRate) * 100 : 0,
    });
    // Path 3: Increase AOV
    const neededAOV = m.conversions > 0 ? goalRevenue / m.conversions : 0;
    scenarios.push({
      label: 'Increase Avg Order Value',
      description: `AOV to ${formatCurrency(neededAOV)}`,
      change: inputs.avgOrderValue > 0 ? ((neededAOV - inputs.avgOrderValue) / inputs.avgOrderValue) * 100 : 0,
    });
    return scenarios.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data: revenue at different conversion rates
  const convRates = [0.5, 1, 2, 3, 4, 5, 5.89, 7, 8, 9, 10, 11.45, 13, 15];
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  // Build chart datasets for all scenarios
  const buildChartForScenario = (inp: Inputs) => {
    const eff = inp.monthlyVisitors * (1 - inp.bounceRate / 100);
    return convRates.map(cr => eff * (cr / 100) * inp.avgOrderValue);
  };

  const chartRevenues = buildChartForScenario(inputs);

  const pointRadii = convRates.map(cr => {
    if (cr === inputs.conversionRate) return 8;
    if (cr === benchmarks.landing_pages.avg_conversion_rate) return 6;
    if (cr === benchmarks.landing_pages.good_conversion_rate) return 6;
    return 2;
  });
  const pointColors = convRates.map(cr => {
    if (cr === inputs.conversionRate) return '#3B82F6';
    if (cr === benchmarks.landing_pages.avg_conversion_rate) return '#F59E0B';
    if (cr === benchmarks.landing_pages.good_conversion_rate) return '#10B981';
    return 'rgba(59, 130, 246, 0.5)';
  });

  // If current conv rate is not in convRates, insert it for display
  const displayRates = [...convRates];
  const displayRevenues = [...chartRevenues];
  const displayPointRadii = [...pointRadii];
  const displayPointColors = [...pointColors];
  if (!convRates.includes(inputs.conversionRate)) {
    const insertIdx = displayRates.findIndex(r => r > inputs.conversionRate);
    const pos = insertIdx === -1 ? displayRates.length : insertIdx;
    displayRates.splice(pos, 0, inputs.conversionRate);
    const eff = inputs.monthlyVisitors * (1 - inputs.bounceRate / 100);
    displayRevenues.splice(pos, 0, eff * (inputs.conversionRate / 100) * inputs.avgOrderValue);
    displayPointRadii.splice(pos, 0, 8);
    displayPointColors.splice(pos, 0, '#3B82F6');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartDatasets: any[] = [
    {
      label: scenarios.length > 1 ? currentScenario.label : 'Monthly Revenue',
      data: displayRevenues,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: displayPointRadii,
      pointBackgroundColor: displayPointColors,
    },
  ];

  // Add other scenarios as overlays
  if (scenarios.length > 1) {
    scenarios.filter(s => s.id !== activeScenario).forEach((s) => {
      const eff = s.inputs.monthlyVisitors * (1 - s.inputs.bounceRate / 100);
      const data = displayRates.map(cr => eff * (cr / 100) * s.inputs.avgOrderValue);
      const colorIdx = scenarios.indexOf(s);
      chartDatasets.push({
        label: s.label,
        data,
        borderColor: scenarioColors[colorIdx],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        borderDash: [6, 3],
        pointRadius: 3,
      });
    });
  }

  // Benchmark lines
  chartDatasets.push(
    {
      label: `Avg Benchmark (${benchmarks.landing_pages.avg_conversion_rate}%)`,
      data: displayRates.map(() => {
        const eff = inputs.monthlyVisitors * (1 - inputs.bounceRate / 100);
        return eff * (benchmarks.landing_pages.avg_conversion_rate / 100) * inputs.avgOrderValue;
      }),
      borderColor: '#F59E0B',
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0,
    },
    {
      label: `Good Benchmark (${benchmarks.landing_pages.good_conversion_rate}%)`,
      data: displayRates.map(() => {
        const eff = inputs.monthlyVisitors * (1 - inputs.bounceRate / 100);
        return eff * (benchmarks.landing_pages.good_conversion_rate / 100) * inputs.avgOrderValue;
      }),
      borderColor: '#10B981',
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0,
    },
  );

  const chartData = {
    labels: displayRates.map(r => `${r}%`),
    datasets: chartDatasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
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
          label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8', maxRotation: 45, font: { size: 10 } },
        title: { display: true, text: 'Conversion Rate', color: '#94A3B8' },
      },
      y: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => '$' + Number(v).toLocaleString(),
        },
        title: { display: true, text: 'Monthly Revenue', color: '#94A3B8' },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    const avgCR = benchmarks.landing_pages.avg_conversion_rate;
    const goodCR = benchmarks.landing_pages.good_conversion_rate;

    if (m.profit < 0) {
      return {
        status: 'danger',
        title: `Currently losing ${formatCurrency(Math.abs(m.profit))}/month. Traffic costs exceed landing page revenue.`,
        actions: [
          {
            icon: '🔧',
            text: 'Reduce cost per visitor — optimize ad targeting or switch to cheaper traffic sources.',
            link: '/tools/cpc-cpm-cpa-converter',
            affiliateText: 'Analyze traffic costs with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          {
            icon: '🎯',
            text: 'Improve conversion rate — A/B test headlines, CTAs, and page layout.',
            link: '/tools/ab-test-calculator',
          },
          {
            icon: '💰',
            text: `Increase average order value above ${formatCurrency(inputs.avgOrderValue)} with upsells and bundles.`,
          },
          { icon: '⏸️', text: 'Reduce bounce rate — ensure ad-to-page message match and improve page speed.' },
        ],
      };
    }
    if (inputs.conversionRate < avgCR) {
      return {
        status: 'warning',
        title: `Conversion rate of ${formatPercent(inputs.conversionRate)} is below the ${formatPercent(avgCR)} industry average. Room to grow.`,
        actions: [
          {
            icon: '📈',
            text: 'Add social proof — testimonials, reviews, and trust badges increase conversions by 15-30%.',
            affiliateText: 'Optimize with Unbounce → Try free',
            affiliateUrl: affiliateData.partners.unbounce.url,
          },
          {
            icon: '🧪',
            text: 'Run A/B tests on your headline and CTA button — small changes can yield big lifts.',
            link: '/tools/ab-test-calculator',
          },
          { icon: '⚡', text: 'Optimize page load speed — every extra second costs up to 7% in conversions.' },
        ],
      };
    }
    if (inputs.conversionRate < goodCR) {
      return {
        status: 'good',
        title: `Conversion rate of ${formatPercent(inputs.conversionRate)} beats the average. Solid performance.`,
        actions: [
          {
            icon: '📊',
            text: 'Scale traffic by 20-30% while monitoring conversion rate stability.',
            affiliateText: 'Find new traffic channels with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          {
            icon: '🧪',
            text: 'Test more aggressive offers — free shipping, limited-time discounts, or bonuses.',
            link: '/tools/ab-test-calculator',
          },
          {
            icon: '📧',
            text: 'Add exit-intent popups and email capture to monetize bouncing visitors.',
            link: '/tools/email-roi-calculator',
          },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Conversion rate of ${formatPercent(inputs.conversionRate)} is exceptional — top performer territory.`,
      actions: [
        {
          icon: '🚀',
          text: 'Scale aggressively — increase ad budget and expand to new traffic channels.',
          link: '/tools/roas-calculator',
          affiliateText: 'Find new channels with Semrush → Try free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Clone this landing page formula for other products or services.' },
        {
          icon: '📧',
          text: 'Build post-conversion email sequences to maximize customer lifetime value.',
          link: '/tools/email-roi-calculator',
        },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Landing Page Conversion Estimator</h1>
        <p className="text-label max-w-2xl">
          This Landing Page Conversion Estimator lets you model the revenue impact of different
          conversion rates and traffic levels. Drag sliders to simulate optimization scenarios,
          see how your conversion rate compares to industry benchmarks, and share your analysis
          with your team — all in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============ INPUT PANEL ============ */}
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          {/* Scenario tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map(s => (
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
            label="Monthly Visitors"
            value={inputs.monthlyVisitors}
            min={100}
            max={1000000}
            step={100}
            onChange={(v) => update('monthlyVisitors', v)}
            benchmarkChips={[
              { label: '5K', value: 5000 },
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
            ]}
          />
          <ScenarioSlider
            label="Conversion Rate"
            value={inputs.conversionRate}
            min={0.1}
            max={30}
            step={0.1}
            suffix="%"
            benchmark={benchmarks.landing_pages.avg_conversion_rate}
            benchmarkLabel="Landing page avg"
            onChange={(v) => update('conversionRate', v)}
          />
          <ScenarioSlider
            label="Average Order Value"
            value={inputs.avgOrderValue}
            min={1}
            max={5000}
            step={1}
            prefix="$"
            onChange={(v) => update('avgOrderValue', v)}
            benchmarkChips={[
              { label: 'eComm $75', value: 75 },
              { label: 'SaaS $49', value: 49 },
              { label: 'B2B $2,500', value: 2500 },
            ]}
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
                label="Cost Per Visitor"
                value={inputs.costPerVisitor}
                min={0.01}
                max={20}
                step={0.01}
                prefix="$"
                onChange={(v) => update('costPerVisitor', v)}
              />
              <ScenarioSlider
                label="Bounce Rate"
                value={inputs.bounceRate}
                min={10}
                max={95}
                step={1}
                suffix="%"
                benchmark={benchmarks.landing_pages.avg_bounce_rate}
                benchmarkLabel="Landing page avg"
                onChange={(v) => update('bounceRate', v)}
              />
              <ScenarioSlider
                label="Monthly Fixed Costs"
                value={inputs.monthlyFixedCosts}
                min={0}
                max={50000}
                step={100}
                prefix="$"
                onChange={(v) => update('monthlyFixedCosts', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards — show comparison if multiple scenarios */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(m.revenue)}
                subtitle={`${formatCurrency(m.revenuePerVisitor)} per visitor`}
                color={m.revenue > m.totalCosts ? 'green' : 'amber'}
              />
              <KPICard
                title="Net Profit"
                value={formatCurrency(m.profit)}
                subtitle={`Costs: ${formatCurrency(m.totalCosts)}`}
                color={m.profit > 0 ? 'green' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Conversions"
                value={formatNumber(Math.round(m.conversions))}
                subtitle={`${formatPercent(inputs.conversionRate)} conversion rate`}
                color="blue"
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
                      <p className="text-[10px] text-muted uppercase">Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Net Profit</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.metrics.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Conversions</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatNumber(Math.round(s.metrics.conversions))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="landing-page-estimator" />

          {/* Chart — bigger height */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Revenue at Different Conversion Rates</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Conversion Rate vs. Industry"
            value={inputs.conversionRate}
            benchmark={benchmarks.landing_pages.avg_conversion_rate}
            min={0}
            max={20}
            suffix="%"
            affiliateUrl={affiliateData.partners.unbounce.url}
            affiliateText="Build better landing pages"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="landing-page-estimator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Target Monthly Revenue — Find Your Path
            </h3>
            <button onClick={() => setIsReverse(false)} className="text-xs text-muted hover:text-label">
              Close ×
            </button>
          </div>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Revenue</label>
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
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Most realistic</span>}
                <h4 className="text-sm font-semibold text-foreground mt-2">{scenario.label}</h4>
                <p className="text-xs text-label mt-1">{scenario.description}</p>
                <p className="text-xs font-mono mt-2 text-label">
                  Change: <span className={scenario.change > 0 ? 'text-danger' : 'text-success'}>
                    {scenario.change > 0 ? '+' : ''}{scenario.change.toFixed(1)}%
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={{
          monthlyVisitors: 'Monthly Visitors',
          conversionRate: 'Conversion Rate',
          avgOrderValue: 'Avg Order Value',
          costPerVisitor: 'Cost Per Visitor',
          bounceRate: 'Bounce Rate',
          monthlyFixedCosts: 'Fixed Costs',
        }}
        calculateFn={calcProfit}
        resultLabel="net profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Landing Page Conversion Optimization: The Complete Guide</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Your landing page is where marketing dollars either multiply or evaporate. It sits at the critical
            junction between traffic acquisition and revenue generation — the single page that determines whether
            a visitor becomes a customer or bounces away forever. Understanding and optimizing your landing page
            conversion rate is one of the highest-leverage activities in digital marketing.
          </p>
          <p>
            The average landing page converts at 5.89% across all industries, but this number hides enormous
            variation. Top-performing pages achieve conversion rates above 27%, while poorly optimized pages
            languish below 2%. The difference between a 3% and a 10% conversion rate on the same traffic volume
            means 3.3x more revenue — without spending a single additional dollar on advertising.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Why Bounce Rate Matters More Than You Think</h3>
          <p>
            Bounce rate is the silent killer of landing page performance. When 60% of your visitors leave without
            interacting with your page, you are paying full price for traffic that never had a chance to convert.
            This calculator accounts for bounce rate by computing effective visitors — the subset of traffic that
            actually engages with your offer. Reducing bounce rate from 60% to 40% is equivalent to getting 50%
            more engaged visitors at zero additional cost.
          </p>
          <p>
            Common causes of high bounce rate include slow page load times (pages that take more than 3 seconds
            to load lose 53% of mobile visitors), poor ad-to-page message match (the visitor expected something
            different from what they see), cluttered layouts with too many competing calls to action, and lack
            of immediate value proposition above the fold.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">The Economics of Conversion Rate Optimization</h3>
          <p>
            This estimator reveals the full economic picture of your landing page by connecting conversion rate
            to actual revenue and profit. It is not enough to know your conversion rate in isolation — you need
            to understand how it interacts with your traffic costs, average order value, and fixed expenses to
            determine whether your page is truly profitable.
          </p>
          <p>
            The cost per conversion metric is particularly revealing. If you are paying $2.50 per visitor with
            a 5% conversion rate, each conversion costs you $50 in traffic alone. If your average order value
            is $75, that leaves only $25 of gross margin per sale before fixed costs. Improving conversion rate
            to 10% cuts your cost per conversion in half — to $25 — and doubles your margin per sale. To build pages that convert from day one, <a href={affiliateData.partners.unbounce.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Unbounce&apos;s Smart Builder uses AI to create landing pages optimized for your specific audience</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Use This Landing Page Estimator</h3>
          <p>
            Start by entering your current monthly traffic volume and the conversion rate you are observing.
            Set your average order value and the cost you pay per visitor (from ads, content marketing, or
            other channels). Adjust the bounce rate slider to reflect your actual analytics data, and include
            any fixed monthly costs such as hosting, tools, or team salaries.
          </p>
          <p>
            The revenue curve chart shows how your monthly revenue scales across different conversion rates,
            with benchmark lines for average and good performance. The Risk Radar identifies which variable has
            the greatest impact on your profitability — so you know exactly where to focus your optimization
            efforts. Use the reverse goal mode to work backward from a revenue target and discover the most
            achievable path to reach it, whether that means more traffic, higher conversion rates, or larger
            order values.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Proven Strategies to Increase Conversions</h3>
          <p>
            The highest-impact changes typically involve headline optimization, call-to-action design, and
            social proof placement. Your headline should match the exact language and promise from the ad or
            link that brought visitors to the page. Your CTA button should stand out visually and use
            action-oriented language that communicates value rather than effort. Social proof — testimonials,
            customer counts, trust badges, and case studies — should appear early and prominently, as it can
            increase conversions by 15-30% on its own. For a no-code way to test headlines, CTAs, and layouts, <a href={affiliateData.partners.unbounce.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Unbounce&apos;s drag-and-drop builder with built-in A/B testing</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="landing-page-estimator" />
      {/* Related Tools */}
      <PreRelatedCTA toolSlug="landing-page-estimator" />
      <RelatedTools currentSlug="landing-page-estimator" />
    </div>
  );
}
