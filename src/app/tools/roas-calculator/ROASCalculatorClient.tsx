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
import annotationPlugin from 'chartjs-plugin-annotation';
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
// Benchmarks are now handled by industry presets inline

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

/* ================================================================== */
/*  Industry Presets                                                   */
/* ================================================================== */
const industries = [
  { value: 'ecommerce', label: 'eCommerce', avgRoas: 2.5, cogsRate: 0.6, aov: 75, cpc: 1.72, cvr: 3.75 },
  { value: 'saas', label: 'SaaS', avgRoas: 4.0, cogsRate: 0.15, aov: 49, cpc: 3.80, cvr: 2.35 },
  { value: 'agency', label: 'Agency', avgRoas: 5.0, cogsRate: 0.10, aov: 2500, cpc: 5.26, cvr: 2.0 },
  { value: 'b2b', label: 'B2B', avgRoas: 3.0, cogsRate: 0.25, aov: 500, cpc: 4.50, cvr: 2.0 },
  { value: 'fintech', label: 'Fintech', avgRoas: 3.5, cogsRate: 0.20, aov: 200, cpc: 5.00, cvr: 1.8 },
] as const;

type IndustryKey = typeof industries[number]['value'];

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  adSpend: 5000,
  revenue: 15000,
  cogs: 4500,
  cpc: 2.50,
  conversionRate: 3.5,
  avgOrderValue: 75,
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
    question: 'What is ROAS and how is it calculated?',
    answer: 'ROAS (Return on Ad Spend) measures how much revenue you earn for every dollar spent on advertising. It is calculated by dividing your total ad revenue by your total ad spend. A ROAS of 3.0x means you earn $3 for every $1 spent on ads.',
  },
  {
    question: 'What is a good ROAS for my industry?',
    answer: 'A good ROAS varies by industry and channel. For Google Ads, the average ROAS is around 2.0x. For Facebook Ads, it is around 2.5x. Generally, a ROAS above 3.0x is considered strong, while anything below 1.0x means you are losing money on ads.',
  },
  {
    question: 'How is ROAS different from ROI?',
    answer: 'ROAS measures gross revenue generated per dollar of ad spend, while ROI (Return on Investment) accounts for all costs including COGS, overhead, and ad spend to measure net profit. ROAS is a top-line metric; ROI is a bottom-line metric.',
  },
  {
    question: 'How can I improve my ROAS?',
    answer: 'To improve ROAS: optimize ad targeting to reach higher-intent audiences, improve landing page conversion rates, increase average order value through upsells, reduce CPC through better ad quality scores, and pause underperforming campaigns.',
  },
  {
    question: 'Should I use ROAS or CPA as my primary metric?',
    answer: 'Use ROAS when you want to understand overall return from ads and can track revenue directly. Use CPA (Cost Per Acquisition) when you want to control acquisition costs per customer. Many marketers track both — ROAS for profitability view and CPA for cost efficiency.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const roas = inp.adSpend > 0 ? inp.revenue / inp.adSpend : 0;
  const grossProfit = inp.revenue - inp.cogs;
  const netProfit = grossProfit - inp.adSpend;
  const grossMargin = inp.revenue > 0 ? (grossProfit / inp.revenue) * 100 : 0;
  const breakEvenRoas = grossMargin > 0 ? 100 / grossMargin : 0;
  const clicks = inp.cpc > 0 ? inp.adSpend / inp.cpc : 0;
  const conversions = clicks * (inp.conversionRate / 100);
  const projectedRevenue = conversions * inp.avgOrderValue;
  return { roas, grossProfit, netProfit, grossMargin, breakEvenRoas, clicks, conversions, projectedRevenue };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function ROASCalculatorClient() {
  const [industry, setIndustry] = useState<IndustryKey>('ecommerce');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');

  // Reverse goal state
  const [reverseTarget, setReverseTarget] = useState<number | null>(null);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  const industryData = industries.find(i => i.value === industry)!;
  const benchmarkRoas = industryData.avgRoas;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('roas-calculator');
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
    saveToLocalStorage('roas-calculator', inputs);
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
    // Offset inputs so scenarios differ immediately
    const offset: Inputs = {
      ...inputs,
      adSpend: Math.round(inputs.adSpend * 1.2),
      cpc: +(inputs.cpc * 0.9).toFixed(2),
    };
    setScenarios(prev => [...prev, { id: nextId, label: `Scenario ${nextId}`, inputs: offset }]);
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
    return (inp.revenue || 0) - (inp.cogs || 0) - (inp.adSpend || 0);
  }, []);

  // Reverse goal paths
  const reversePaths = reverseTarget !== null ? (() => {
    const margin = m.grossMargin / 100;
    if (margin <= 0) return [];
    const paths = [];
    // Path 1: Increase revenue
    const neededRev = inputs.cogs + (reverseTarget + inputs.adSpend) / (margin || 0.01);
    paths.push({
      label: 'Increase Revenue',
      description: `Revenue to ${formatCurrency(neededRev)}`,
      change: inputs.revenue > 0 ? ((neededRev - inputs.revenue) / inputs.revenue) * 100 : 0,
    });
    // Path 2: Reduce ad spend
    const neededSpend = m.grossProfit - reverseTarget;
    paths.push({
      label: 'Reduce Ad Spend',
      description: `Ad spend to ${formatCurrency(Math.max(0, neededSpend))}`,
      change: inputs.adSpend > 0 ? ((neededSpend - inputs.adSpend) / inputs.adSpend) * 100 : 0,
    });
    // Path 3: Reduce COGS
    const neededCogs = inputs.revenue - inputs.adSpend - reverseTarget;
    paths.push({
      label: 'Reduce COGS',
      description: `COGS to ${formatCurrency(Math.max(0, neededCogs))}`,
      change: inputs.cogs > 0 ? ((neededCogs - inputs.cogs) / inputs.cogs) * 100 : 0,
    });
    return paths.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data
  const spendLevels = Array.from({ length: 10 }, (_, i) => Math.round(inputs.adSpend * (0.5 + i * 0.15)));
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartDatasets = allMetrics.map((s, idx) => ({
    label: s.label,
    data: spendLevels.map(spend => {
      const c = spend / s.inputs.cpc;
      return c * (s.inputs.conversionRate / 100) * s.inputs.avgOrderValue;
    }),
    borderColor: scenarioColors[idx],
    backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
    fill: idx === 0,
    tension: 0.3,
    borderDash: idx > 0 ? [6, 3] : [],
    pointRadius: 3,
  }));

  const breakEvenValue = spendLevels[0] * m.breakEvenRoas;
  chartDatasets.push({
    label: `Break-even (${m.breakEvenRoas.toFixed(1)}x)`,
    data: spendLevels.map(spend => spend * m.breakEvenRoas),
    borderColor: '#F59E0B',
    backgroundColor: 'transparent',
    fill: false,
    tension: 0,
    borderDash: [4, 4],
    pointRadius: 0,
  });

  const chartData = {
    labels: spendLevels.map(s => formatCurrency(s, 0)),
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
      annotation: {
        annotations: {
          breakEvenLabel: {
            type: 'label' as const,
            xValue: formatCurrency(spendLevels[spendLevels.length - 1], 0),
            yValue: breakEvenValue,
            content: [`Break-even: ${formatCurrency(breakEvenValue, 0)}`],
            color: '#F59E0B',
            font: { size: 10 },
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8', maxRotation: 45, font: { size: 10 } },
        title: { display: true, text: 'Ad Spend', color: '#94A3B8' },
      },
      y: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => '$' + Number(v).toLocaleString(),
        },
        title: { display: true, text: 'Revenue', color: '#94A3B8' },
      },
    },
  };

  // Action panel with user-specific numbers
  const cpcVsAvg = ((inputs.cpc - industryData.cpc) / industryData.cpc * 100);
  const improvedCpc = Math.max(industryData.cpc, inputs.cpc * 0.75);
  const clicksAtImprovedCpc = inputs.adSpend / improvedCpc;
  const extraClicks = clicksAtImprovedCpc - (inputs.adSpend / inputs.cpc);
  const extraRevEstimate = extraClicks * (inputs.conversionRate / 100) * inputs.avgOrderValue;

  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.roas < m.breakEvenRoas) {
      return {
        status: 'danger',
        title: `Your ROAS of ${m.roas.toFixed(2)}x is below break-even (${m.breakEvenRoas.toFixed(2)}x). You are losing ${formatCurrency(Math.abs(m.netProfit))}/month on ads.`,
        actions: [
          {
            icon: '🔧',
            text: `Your CPC of $${inputs.cpc.toFixed(2)} is ${Math.abs(cpcVsAvg).toFixed(0)}% ${cpcVsAvg > 0 ? 'above' : 'below'} the ${industryData.label} average of $${industryData.cpc.toFixed(2)}. Reducing CPC to $${improvedCpc.toFixed(2)} would add ~${Math.round(extraClicks).toLocaleString()} clicks/month, adding an estimated ${formatCurrency(extraRevEstimate)} to revenue.`,
            link: '/tools/cpc-cpm-cpa-converter',
            affiliateText: 'Analyze competitor CPC with Semrush → Try free',
            affiliateUrl: '#semrush-affiliate',
          },
          {
            icon: '🎯',
            text: `Your conversion rate of ${inputs.conversionRate}% — increasing it by just 1% would generate ~${Math.round((inputs.adSpend / inputs.cpc) * 0.01 * inputs.avgOrderValue).toLocaleString()} more in monthly revenue.`,
            link: '/tools/landing-page-estimator',
          },
          { icon: '⏸️', text: 'Pause lowest-performing campaigns and reallocate budget to top performers.' },
        ],
      };
    }
    if (m.roas < benchmarkRoas) {
      return {
        status: 'warning',
        title: `ROAS of ${m.roas.toFixed(2)}x is above break-even but below ${industryData.label} average (${benchmarkRoas}x). Net profit: ${formatCurrency(m.netProfit)}/month.`,
        actions: [
          {
            icon: '📈',
            text: `Your gross margin is ${m.grossMargin.toFixed(1)}%. Reducing COGS by 10% would add ${formatCurrency(inputs.cogs * 0.1)} to monthly profit.`,
          },
          {
            icon: '🎯',
            text: 'Add retargeting to capture warm leads at lower CPA.',
            link: '/tools/ad-budget-planner',
            affiliateText: 'Set up retargeting with Semrush → Try free',
            affiliateUrl: '#semrush-affiliate',
          },
        ],
      };
    }
    if (m.roas < benchmarkRoas * 1.5) {
      return {
        status: 'good',
        title: `ROAS of ${m.roas.toFixed(2)}x exceeds ${industryData.label} average (${benchmarkRoas}x). Net profit: ${formatCurrency(m.netProfit)}/month.`,
        actions: [
          {
            icon: '📊',
            text: `Consider scaling ad spend from ${formatCurrency(inputs.adSpend)} to ${formatCurrency(inputs.adSpend * 1.25)} (+25%). At current ROAS, that could add ${formatCurrency(inputs.adSpend * 0.25 * m.roas - inputs.adSpend * 0.25)} to monthly profit.`,
            link: '/tools/ad-budget-planner',
          },
          {
            icon: '🧪',
            text: 'A/B test ad creatives to find even higher-performing variants.',
            link: '/tools/ab-test-calculator',
            affiliateText: 'Track performance with Semrush → Try free',
            affiliateUrl: '#semrush-affiliate',
          },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `ROAS of ${m.roas.toFixed(2)}x is exceptional — ${((m.roas / benchmarkRoas - 1) * 100).toFixed(0)}% above ${industryData.label} average. Net profit: ${formatCurrency(m.netProfit)}/month.`,
      actions: [
        {
          icon: '🚀',
          text: `Scale aggressively — increasing budget from ${formatCurrency(inputs.adSpend)} to ${formatCurrency(inputs.adSpend * 1.3)} at your current ${m.roas.toFixed(1)}x ROAS could generate an additional ${formatCurrency(inputs.adSpend * 0.3 * (m.roas - m.breakEvenRoas))} in net profit.`,
          link: '/tools/ad-budget-planner',
          affiliateText: 'Find new channels with Semrush → Try free',
          affiliateUrl: '#semrush-affiliate',
        },
        {
          icon: '📧',
          text: `Build email sequences to maximize LTV — your ${Math.round(m.conversions)} monthly conversions are a growth engine.`,
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
        <h1 className="text-3xl font-bold text-foreground mb-3">ROAS Calculator</h1>
        <p className="text-label max-w-2xl">
          This ROAS Calculator lets you drag sliders to simulate different ad spend
          scenarios and see profitability change instantly. Compare multiple scenarios
          side by side, see how you stack up against industry benchmarks, and share
          your analysis with your team — all in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============ INPUT PANEL ============ */}
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          {/* Industry selector */}
          <div className="mb-5">
            <label className="text-xs font-medium text-label uppercase tracking-wider block mb-2">Industry</label>
            <div className="flex flex-wrap gap-1.5">
              {industries.map(ind => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    industry === ind.value
                      ? 'bg-accent text-white'
                      : 'bg-surface-light text-label hover:text-foreground border border-surface-lighter'
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

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
            label="Monthly Ad Spend"
            value={inputs.adSpend}
            min={100}
            max={100000}
            step={100}
            prefix="$"
            onChange={(v) => update('adSpend', v)}
            benchmarkChips={[
              { label: 'SMB $2k', value: 2000 },
              { label: 'Mid $5k', value: 5000 },
              { label: 'Growth $15k', value: 15000 },
              { label: 'Enterprise $50k', value: 50000 },
            ]}
          />
          <ScenarioSlider
            label="Monthly Revenue from Ads"
            value={inputs.revenue}
            min={0}
            max={500000}
            step={100}
            prefix="$"
            onChange={(v) => update('revenue', v)}
            benchmarkChips={[
              { label: `${industryData.label} ${industryData.avgRoas}x`, value: Math.round(inputs.adSpend * industryData.avgRoas) },
              { label: 'Break-even', value: Math.round(inputs.adSpend * (m.breakEvenRoas || 1)) },
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
                label="Cost of Goods Sold (COGS)"
                value={inputs.cogs}
                min={0}
                max={200000}
                step={100}
                prefix="$"
                onChange={(v) => update('cogs', v)}
                benchmarkChips={[
                  { label: `eComm 60%`, value: Math.round(inputs.revenue * 0.6) },
                  { label: `SaaS 15%`, value: Math.round(inputs.revenue * 0.15) },
                  { label: `Digital 10%`, value: Math.round(inputs.revenue * 0.1) },
                ]}
              />
              <ScenarioSlider
                label="Cost Per Click (CPC)"
                value={inputs.cpc}
                min={0.1}
                max={20}
                step={0.1}
                prefix="$"
                benchmark={industryData.cpc}
                benchmarkLabel={`${industryData.label} avg`}
                onChange={(v) => update('cpc', v)}
              />
              <ScenarioSlider
                label="Conversion Rate"
                value={inputs.conversionRate}
                min={0.1}
                max={30}
                step={0.1}
                suffix="%"
                benchmark={industryData.cvr}
                benchmarkLabel={`${industryData.label} avg`}
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
                  { label: 'SaaS $49/mo', value: 49 },
                  { label: 'B2B $2,500', value: 2500 },
                ]}
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
                title="ROAS"
                value={`${m.roas.toFixed(2)}x`}
                subtitle={m.roas >= m.breakEvenRoas ? 'Profitable' : 'Below break-even'}
                color={m.roas >= m.breakEvenRoas * 1.5 ? 'green' : m.roas >= m.breakEvenRoas ? 'amber' : 'red'}
              />
              <KPICard
                title="Net Profit"
                value={formatCurrency(m.netProfit)}
                subtitle={`Margin: ${m.grossMargin.toFixed(1)}%`}
                color={m.netProfit > 0 ? 'green' : 'red'}
                clickable
                onGoalSubmit={(goal) => setReverseTarget(goal)}
              />
              <KPICard
                title="Projected Revenue"
                value={formatCurrency(m.projectedRevenue)}
                subtitle={`${Math.round(m.conversions)} conversions`}
                color="blue"
              />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => {
                const baseM = allMetrics[0].metrics;
                const diff = idx > 0;
                return (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>
                    {s.label}
                    {idx === 0 && <span className="text-muted font-normal ml-2">(baseline)</span>}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">ROAS</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.metrics.roas.toFixed(2)}x
                        {diff && (
                          <span className={`text-xs ml-1 ${s.metrics.roas >= baseM.roas ? 'text-success' : 'text-danger'}`}>
                            {s.metrics.roas >= baseM.roas ? '▲' : '▼'} {Math.abs(s.metrics.roas - baseM.roas).toFixed(2)}x
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Net Profit</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.metrics.netProfit)}
                        {diff && (
                          <span className={`text-xs ml-1 ${s.metrics.netProfit >= baseM.netProfit ? 'text-success' : 'text-danger'}`}>
                            {s.metrics.netProfit >= baseM.netProfit ? '▲' : '▼'} {formatCurrency(Math.abs(s.metrics.netProfit - baseM.netProfit))}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Proj. Rev</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.projectedRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Chart — 1.5x height */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Revenue vs. Ad Spend Scenarios</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label={`Your ROAS vs. ${industryData.label} Average`}
            value={m.roas}
            benchmark={benchmarkRoas}
            min={0}
            max={Math.max(8, m.roas * 1.3)}
            suffix="x"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="roas-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {reverseTarget !== null && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              🎯 Paths to reach {formatCurrency(reverseTarget)} net profit
            </h3>
            <button onClick={() => setReverseTarget(null)} className="text-xs text-muted hover:text-label">
              Close ×
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reversePaths.map((path, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}
              >
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Most realistic</span>}
                <h4 className="text-sm font-semibold text-foreground mt-2">{path.label}</h4>
                <p className="text-xs text-label mt-1">{path.description}</p>
                <p className="text-xs font-mono mt-2 text-label">
                  Change: <span className={Math.abs(path.change) > 50 ? 'text-danger' : path.change > 0 ? 'text-warning' : 'text-success'}>
                    {path.change > 0 ? '+' : ''}{path.change.toFixed(1)}%
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
          adSpend: 'Ad Spend',
          revenue: 'Revenue',
          cogs: 'COGS',
          cpc: 'CPC',
          conversionRate: 'Conv. Rate',
          avgOrderValue: 'Avg Order Value',
        }}
        calculateFn={calcProfit}
        resultLabel="net profit"
        resultPrefix="$"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">What Is ROAS and Why It Matters</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Return on Ad Spend (ROAS) is the single most important metric for evaluating the effectiveness
            of your advertising campaigns. It tells you exactly how much revenue you generate for every
            dollar invested in advertising — and whether your campaigns are actually profitable.
          </p>
          <p>
            The formula is straightforward: ROAS = Revenue from Ads / Ad Spend. A ROAS of 3.0x means you
            earn $3 for every $1 you spend on advertising. But raw ROAS alone does not tell the whole story
            — you need to factor in your Cost of Goods Sold (COGS) and operating expenses to understand
            true profitability.
          </p>
          <p>
            That is why this calculator goes beyond simple ROAS math. It calculates your break-even ROAS
            based on your actual gross margins, projects revenue at different spend levels using your CPC
            and conversion rate, and shows you exactly where you stand against industry benchmarks.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Use This ROAS Calculator</h3>
          <p>
            Start by entering your current monthly ad spend and the revenue generated from those ads — these
            two inputs are all you need for a basic ROAS calculation. Open Advanced Inputs to add COGS,
            CPC, conversion rate, and average order value for deeper analysis including break-even ROAS,
            projected revenue curves, and sensitivity analysis.
          </p>
          <p>
            Use the scenario comparison feature to model different strategies side by side — what happens
            if you increase budget by 50%? What if you improve conversion rate? The Risk Radar identifies
            which variable has the biggest impact on your profits, so you know where to focus optimization.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Industry Benchmarks</h3>
          <p>
            Average ROAS varies significantly by platform and industry. Google Ads averages around 2.0x,
            while Facebook Ads typically delivers 2.5x ROAS. E-commerce brands often target 4.0x+ ROAS,
            while lead generation campaigns may accept lower ROAS if the customer lifetime value is high.
            Select your industry above to see relevant benchmarks throughout the calculator.
          </p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="roas-calculator" />
      <RelatedTools currentSlug="roas-calculator" />
    </div>
  );
}
