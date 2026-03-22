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
import { formatCurrency, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  articlesPerMonth: 8,
  costPerArticle: 250,
  avgTrafficPerArticle: 1500,
  trafficValuePerVisit: 0.10,
  conversionRate: 2.35,
  avgLeadValue: 50,
  contentLifespanMonths: 24,
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
    question: 'What is a good ROI for content marketing?',
    answer: 'A good content marketing ROI is typically 3x or higher, meaning you earn $3 for every $1 invested. However, content marketing is a long-term play. Most content programs operate at a loss for the first 3-6 months before compounding traffic and lead generation push returns above the break-even point. Top-performing programs achieve 5-10x ROI within 12-18 months as their content library grows and older articles continue driving traffic and conversions.',
  },
  {
    question: 'How long does it take for content marketing to become profitable?',
    answer: 'Most content marketing programs reach profitability between months 4 and 8, depending on publishing frequency, content quality, and niche competitiveness. The key is content compounding: each article you publish continues generating traffic for months or years. With 8 articles per month at industry-average traffic levels, cumulative returns typically surpass cumulative costs around month 6. Higher publishing frequencies and better conversion optimization shorten this timeline.',
  },
  {
    question: 'How does content compounding affect ROI over time?',
    answer: 'Content compounding is the single most powerful force in content marketing economics. Unlike paid advertising where traffic stops when spending stops, each published article continues attracting organic traffic throughout its lifespan. After 12 months of publishing 8 articles per month, you have 96 articles generating traffic simultaneously. This compounding effect is why content marketing ROI accelerates dramatically over time and why early months often look unprofitable even when the long-term return is excellent.',
  },
  {
    question: 'What is a realistic cost per lead from content marketing?',
    answer: 'Content marketing cost per lead varies widely by industry and content quality. B2B companies typically see $30-$150 per lead, while B2C brands may achieve $5-$50 per lead. The key advantage of content marketing is that cost per lead decreases over time as your content library grows and cumulative traffic increases without proportional cost increases. After 12 months, cost per lead from content is often 60-80% lower than from paid channels.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const monthlyContentCost = inp.articlesPerMonth * inp.costPerArticle;
  const monthlyTraffic = inp.articlesPerMonth * inp.avgTrafficPerArticle;
  const monthlyTrafficValue = monthlyTraffic * inp.trafficValuePerVisit;
  const monthlyLeads = monthlyTraffic * inp.conversionRate / 100;
  const monthlyLeadRevenue = monthlyLeads * inp.avgLeadValue;
  const totalMonthlyValue = monthlyTrafficValue + monthlyLeadRevenue;
  const roi = monthlyContentCost > 0
    ? ((totalMonthlyValue - monthlyContentCost) / monthlyContentCost) * 100
    : 0;
  const costPerLead = monthlyLeads > 0 ? monthlyContentCost / monthlyLeads : 0;

  // Cumulative ROI over 12 months (content compounding)
  const months: number[] = [];
  const cumulativeCosts: number[] = [];
  const cumulativeValues: number[] = [];
  const cumulativeROIs: number[] = [];
  let totalCost = 0;
  let totalValue = 0;

  for (let m = 1; m <= 12; m++) {
    totalCost += monthlyContentCost;
    // Each month, all articles published so far (up to their lifespan) generate traffic
    const activeArticles = Math.min(m * inp.articlesPerMonth, inp.contentLifespanMonths * inp.articlesPerMonth);
    const cumulativeMonthlyTraffic = activeArticles * inp.avgTrafficPerArticle;
    const cumulativeMonthlyTrafficValue = cumulativeMonthlyTraffic * inp.trafficValuePerVisit;
    const cumulativeMonthlyLeads = cumulativeMonthlyTraffic * inp.conversionRate / 100;
    const cumulativeMonthlyLeadRevenue = cumulativeMonthlyLeads * inp.avgLeadValue;
    const cumulativeMonthlyValue = cumulativeMonthlyTrafficValue + cumulativeMonthlyLeadRevenue;
    totalValue += cumulativeMonthlyValue;

    months.push(m);
    cumulativeCosts.push(totalCost);
    cumulativeValues.push(totalValue);
    cumulativeROIs.push(totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0);
  }

  const twelveMthCumulativeValue = cumulativeValues[11] || 0;
  const twelveMthCumulativeCost = cumulativeCosts[11] || 0;

  return {
    monthlyContentCost,
    monthlyTraffic,
    monthlyTrafficValue,
    monthlyLeads,
    monthlyLeadRevenue,
    totalMonthlyValue,
    roi,
    costPerLead,
    cumulativeData: { months, cumulativeCosts, cumulativeValues, cumulativeROIs },
    twelveMthCumulativeValue,
    twelveMthCumulativeCost,
  };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function ContentROICalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalMonthlyLeads, setGoalMonthlyLeads] = useState(100);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('content-roi-calculator');
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
    saveToLocalStorage('content-roi-calculator', inputs);
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
    const nextId = String.fromCharCode(65 + scenarios.length); // B, C
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
    const cost = (inp.articlesPerMonth || 0) * (inp.costPerArticle || 0);
    const traffic = (inp.articlesPerMonth || 0) * (inp.avgTrafficPerArticle || 0);
    const trafficVal = traffic * (inp.trafficValuePerVisit || 0);
    const leads = traffic * (inp.conversionRate || 0) / 100;
    const leadRev = leads * (inp.avgLeadValue || 0);
    return trafficVal + leadRev - cost;
  }, []);

  // Reverse goal: target monthly leads
  const reverseScenarios = isReverse ? (() => {
    const scenarios = [];
    // Path 1: Increase articles per month
    const leadsPerArticle = inputs.avgTrafficPerArticle * inputs.conversionRate / 100;
    const neededArticles = leadsPerArticle > 0 ? Math.ceil(goalMonthlyLeads / leadsPerArticle) : 0;
    scenarios.push({
      label: 'Increase Articles/Month',
      description: `Publish ${neededArticles} articles per month`,
      change: inputs.articlesPerMonth > 0 ? ((neededArticles - inputs.articlesPerMonth) / inputs.articlesPerMonth) * 100 : 0,
    });
    // Path 2: Improve conversion rate
    const neededConvRate = m.monthlyTraffic > 0 ? (goalMonthlyLeads / m.monthlyTraffic) * 100 : 0;
    scenarios.push({
      label: 'Improve Conversion Rate',
      description: `Conversion rate to ${neededConvRate.toFixed(2)}%`,
      change: inputs.conversionRate > 0 ? ((neededConvRate - inputs.conversionRate) / inputs.conversionRate) * 100 : 0,
    });
    // Path 3: Increase traffic per article
    const neededTrafficPerArticle = inputs.articlesPerMonth > 0 && inputs.conversionRate > 0
      ? Math.ceil(goalMonthlyLeads / (inputs.articlesPerMonth * inputs.conversionRate / 100))
      : 0;
    scenarios.push({
      label: 'Increase Traffic/Article',
      description: `${neededTrafficPerArticle.toLocaleString()} visits per article`,
      change: inputs.avgTrafficPerArticle > 0 ? ((neededTrafficPerArticle - inputs.avgTrafficPerArticle) / inputs.avgTrafficPerArticle) * 100 : 0,
    });
    return scenarios.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — 12-month cumulative investment vs returns
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartDatasets = allMetrics.map((s, idx) => [
    {
      label: `${s.label} — Investment`,
      data: s.metrics.cumulativeData.cumulativeCosts,
      borderColor: idx === 0 ? '#EF4444' : scenarioColors[idx],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      borderDash: [4, 4],
    },
    {
      label: `${s.label} — Returns`,
      data: s.metrics.cumulativeData.cumulativeValues,
      borderColor: idx === 0 ? '#22C55E' : scenarioColors[idx],
      backgroundColor: idx === 0 ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
      fill: idx === 0 ? '-1' : false,
      tension: 0.3,
      pointRadius: 3,
      borderDash: idx > 0 ? [6, 3] : [],
    },
  ]).flat();

  // When only one scenario, simplify labels
  const chartDatasetsSimple = scenarios.length === 1
    ? [
        {
          label: 'Cumulative Investment',
          data: m.cumulativeData.cumulativeCosts,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Cumulative Returns',
          data: m.cumulativeData.cumulativeValues,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: '-1',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ]
    : chartDatasets;

  const chartData = {
    labels: m.cumulativeData.months.map(mo => `Month ${mo}`),
    datasets: chartDatasetsSimple,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { family: 'var(--font-dm-sans)', size: 11 },
        },
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
            return `${ctx.dataset.label}: $${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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

  // Action panel with affiliate links embedded
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.roi < 0) {
      return {
        status: 'danger',
        title: `Content ROI is ${m.roi.toFixed(0)}% — your content program is currently losing money.`,
        actions: [
          {
            icon: '✍️',
            text: 'Reduce per-article costs by using a mix of in-house writing and freelancers, or repurpose existing content.',
            affiliateText: 'Optimize content with SurferSEO → Try free',
            affiliateUrl: affiliateData.partners.surferseo.url,
          },
          {
            icon: '🔍',
            text: 'Improve SEO targeting — focus on long-tail keywords with lower competition and higher purchase intent.',
            affiliateText: 'Find winning keywords with SurferSEO → Try free',
            affiliateUrl: affiliateData.partners.surferseo.url,
          },
          { icon: '📊', text: 'Add stronger CTAs and lead magnets to increase conversion rate on existing content.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    if (m.roi < 100) {
      return {
        status: 'warning',
        title: `Content ROI of ${m.roi.toFixed(0)}% is positive but below the 3x benchmark.`,
        actions: [
          {
            icon: '📈',
            text: 'Focus on content compounding — increase publishing frequency to build your library faster.',
            affiliateText: 'Plan your content with SurferSEO → Try free',
            affiliateUrl: affiliateData.partners.surferseo.url,
          },
          { icon: '🎯', text: 'Target higher-value keywords that attract visitors with stronger purchase intent.' },
          { icon: '🔄', text: 'Update and refresh existing content to boost traffic without additional creation costs.' },
        ],
      };
    }
    if (m.roi < 300) {
      return {
        status: 'good',
        title: `Content ROI of ${m.roi.toFixed(0)}% is strong — approaching the top-performer benchmark.`,
        actions: [
          { icon: '🚀', text: 'Scale your content production — your unit economics support more investment.' },
          {
            icon: '📧',
            text: 'Build email capture flows on top-performing content to increase lead value.',
            link: '/tools/email-roi-calculator',
            affiliateText: 'Optimize content for SEO with SurferSEO → Try free',
            affiliateUrl: affiliateData.partners.surferseo.url,
          },
          { icon: '🧪', text: 'A/B test landing pages and CTAs on your highest-traffic articles to maximize conversions.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Content ROI of ${m.roi.toFixed(0)}% is exceptional — your content is a high-performance growth engine.`,
      actions: [
        {
          icon: '💰',
          text: 'Aggressively scale production — double down on the content formats and topics driving the best results.',
          affiliateText: 'Scale content with SurferSEO → Try free',
          affiliateUrl: affiliateData.partners.surferseo.url,
        },
        { icon: '🌐', text: 'Repurpose top content into video, podcasts, and social media to capture additional channels.' },
        { icon: '📊', text: 'Use the compounding advantage to negotiate better rates with writers by offering volume commitments.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Content ROI Calculator</h1>
        <p className="text-label max-w-2xl">
          This Content ROI Calculator lets you model the compounding returns of your content
          marketing investment over time. Drag sliders to simulate different publishing frequencies
          and conversion rates, see how your metrics compare to industry benchmarks, and share
          your analysis with your team — all in real time.
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
            label="Articles per Month"
            value={inputs.articlesPerMonth}
            min={1}
            max={50}
            step={1}
            onChange={(v) => update('articlesPerMonth', v)}
            benchmarkChips={[
              { label: '4/mo', value: 4 },
              { label: '8/mo', value: 8 },
              { label: '12/mo', value: 12 },
              { label: '20/mo', value: 20 },
            ]}
          />
          <ScenarioSlider
            label="Cost per Article"
            value={inputs.costPerArticle}
            min={50}
            max={2000}
            step={10}
            prefix="$"
            benchmark={benchmarks.content_marketing.avg_cost_per_blog_post}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('costPerArticle', v)}
            benchmarkChips={[
              { label: '$100', value: 100 },
              { label: '$250', value: 250 },
              { label: '$500', value: 500 },
              { label: '$1,000', value: 1000 },
            ]}
          />
          <ScenarioSlider
            label="Avg Traffic per Article"
            value={inputs.avgTrafficPerArticle}
            min={100}
            max={50000}
            step={100}
            benchmark={benchmarks.content_marketing.avg_blog_traffic_per_month}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('avgTrafficPerArticle', v)}
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
                label="Traffic Value per Visit"
                value={inputs.trafficValuePerVisit}
                min={0.01}
                max={5.0}
                step={0.01}
                prefix="$"
                onChange={(v) => update('trafficValuePerVisit', v)}
              />
              <ScenarioSlider
                label="Conversion Rate"
                value={inputs.conversionRate}
                min={0.1}
                max={15}
                step={0.01}
                suffix="%"
                benchmark={benchmarks.content_marketing.avg_content_conversion_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('conversionRate', v)}
              />
              <ScenarioSlider
                label="Average Lead Value"
                value={inputs.avgLeadValue}
                min={1}
                max={500}
                step={1}
                prefix="$"
                onChange={(v) => update('avgLeadValue', v)}
              />
              <ScenarioSlider
                label="Content Lifespan"
                value={inputs.contentLifespanMonths}
                min={1}
                max={60}
                step={1}
                suffix=" months"
                onChange={(v) => update('contentLifespanMonths', v)}
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
                title="Monthly Content ROI"
                value={`${m.roi.toFixed(0)}%`}
                subtitle={m.monthlyContentCost > 0 ? `${(m.roi / 100).toFixed(1)}x return` : 'No cost entered'}
                color={m.roi >= 300 ? 'green' : m.roi >= 100 ? 'amber' : m.roi > 0 ? 'blue' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Cost per Lead"
                value={formatCurrency(m.costPerLead, 2)}
                subtitle={`${Math.round(m.monthlyLeads)} leads/month`}
                color={m.costPerLead > 0 && m.costPerLead < 50 ? 'green' : m.costPerLead < 100 ? 'amber' : 'red'}
              />
              <KPICard
                title="12-Month Cumulative Value"
                value={formatCurrency(m.twelveMthCumulativeValue)}
                subtitle={`vs ${formatCurrency(m.twelveMthCumulativeCost)} invested`}
                color={m.twelveMthCumulativeValue > m.twelveMthCumulativeCost ? 'green' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">ROI</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.metrics.roi.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Cost/Lead</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.costPerLead < 50 ? 'text-success' : s.metrics.costPerLead < 100 ? 'text-warning' : 'text-danger'}`}>
                        {formatCurrency(s.metrics.costPerLead, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">12-Mo Value</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.twelveMthCumulativeValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="content-roi-calculator" />

          {/* Chart — bigger */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">12-Month Cumulative ROI</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Content ROI vs. Average (3x)"
            value={m.roi / 100}
            benchmark={benchmarks.content_marketing.avg_roi_ratio}
            min={0}
            max={10}
            suffix="x"
            affiliateUrl={affiliateData.partners.surferseo.url}
            affiliateText="Optimize your content SEO"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="content-roi-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Monthly Leads — How to reach your goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Leads</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={goalMonthlyLeads}
                onChange={(e) => setGoalMonthlyLeads(parseFloat(e.target.value) || 0)}
                className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent"
              />
              <span className="text-label text-sm">leads/month</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}
              >
                {i === 0 && <span className="text-xs text-accent font-medium">Smallest change needed</span>}
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
          articlesPerMonth: 'Articles/Month',
          costPerArticle: 'Cost/Article',
          avgTrafficPerArticle: 'Traffic/Article',
          trafficValuePerVisit: 'Traffic Value',
          conversionRate: 'Conv. Rate',
          avgLeadValue: 'Lead Value',
          contentLifespanMonths: 'Content Lifespan',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Content Marketing ROI</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Content marketing is one of the few channels where returns actually accelerate over time
            rather than diminish. Unlike paid advertising — where traffic stops the moment you stop
            spending — every article you publish continues generating organic traffic, leads, and
            revenue for months or years after creation. This compounding effect is the fundamental
            reason content marketing delivers a higher long-term ROI than almost any other digital
            marketing channel, with top-performing programs achieving 5-10x returns on investment.
          </p>
          <p>
            This calculator models the compounding dynamics that make content marketing unique. Rather
            than showing you a flat monthly ROI number, it simulates how your content library grows
            over 12 months, with each month&apos;s published articles adding to your cumulative traffic
            and lead generation capacity. The result is a realistic picture of when your content
            program breaks even and how returns accelerate as your library scales.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Content ROI Is Calculated</h3>
          <p>
            Content marketing ROI measures the total value generated by your content relative to the
            cost of creating it. The basic formula is: ROI = ((Total Value - Total Cost) / Total Cost)
            x 100. Total value includes both the direct traffic value (organic traffic multiplied by
            the equivalent cost of acquiring that traffic through paid channels) and the lead revenue
            (traffic multiplied by conversion rate multiplied by average lead value). Total cost is
            simply your publishing volume multiplied by your per-article cost.
          </p>
          <p>
            The critical nuance is compounding. In month one, you have 8 articles generating traffic.
            In month two, you have 16 articles. By month twelve, you have 96 articles all generating
            traffic simultaneously, while your monthly cost has stayed constant. This is why the
            12-month cumulative view in the chart above is so important — it reveals the true economics
            of content marketing that a single-month snapshot completely misses.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Benchmarks for Content Marketing</h3>
          <p>
            The average cost per blog post is approximately $250, though this varies widely based on
            content depth, research requirements, and writer expertise. High-quality long-form content
            (2,000+ words with original research) typically costs $500-$1,500 per piece but often
            generates 3-5x more traffic and leads than shorter content. The average blog post generates
            around 1,500 monthly visitors, with top-performing content achieving 10,000-50,000 or more.
            Content conversion rates average 2.35% across industries, though well-optimized pages with
            strong lead magnets and clear calls to action can achieve 5-10%.
          </p>
          <p>
            The industry-average content marketing ROI ratio is approximately 3.0x, meaning $3 in
            value generated for every $1 spent. However, this average is heavily influenced by the
            compounding timeline. Programs in their first six months often show negative or low ROI,
            while mature programs (12+ months) frequently exceed 5-10x. This is why consistency and
            patience are the most underrated factors in content marketing success. To ensure your content is optimized for search from the start, <a href={affiliateData.partners.surferseo.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">SurferSEO&apos;s content editor scores your articles against top-ranking competitors in real time</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Your Content ROI</h3>
          <p>
            The highest-leverage strategies for improving content ROI fall into three categories. First,
            distribution efficiency: promoting content through email newsletters, social media, and
            strategic internal linking increases the traffic each article generates without increasing
            creation costs. Second, conversion optimization: adding lead magnets, exit-intent popups,
            and contextual CTAs to existing content can double or triple conversion rates on the same
            traffic. Third, content repurposing: transforming a single article into social posts, email
            sequences, videos, and infographics multiplies the value of each piece without the full
            cost of original creation.
          </p>
          <p>
            Use the Risk Radar above to identify which input variable has the greatest impact on your
            content marketing profit. If traffic per article sensitivity is highest, focus on SEO
            optimization and keyword research. If conversion rate dominates, invest in better lead
            magnets and CTA placement. The reverse goal mode lets you work backward from a lead target
            to see exactly what combination of articles, traffic, and conversion rates will get you
            there. For data-driven content planning that maximizes organic traffic, <a href={affiliateData.partners.surferseo.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try SurferSEO&apos;s keyword research and content optimization tools</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="content-roi-calculator" />
      <PreRelatedCTA toolSlug="content-roi-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="content-roi-calculator" />
    </div>
  );
}
