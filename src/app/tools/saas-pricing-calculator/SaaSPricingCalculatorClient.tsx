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
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';
import { formatCurrency, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyPrice: 49,
  customers: 200,
  monthlyChurnRate: 5,
  cacPerCustomer: 150,
  monthlySupportCost: 5,
  grossMarginPercent: 70,
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
    question: 'What is a good LTV:CAC ratio for SaaS?',
    answer: 'The widely accepted benchmark is 3:1 \u2014 meaning each customer should generate three times more lifetime value than it costs to acquire them. Ratios below 1:1 mean you are losing money on every customer. Ratios above 5:1 suggest you may be under-investing in growth and could afford to spend more aggressively on acquisition to scale faster.',
  },
  {
    question: 'How do I reduce SaaS churn?',
    answer: 'Focus on onboarding \u2014 most churn happens in the first 90 days when users fail to reach their "aha moment." Implement in-app guides, proactive customer success outreach, and usage-based health scoring. Product improvements like better UX, faster performance, and feature requests also reduce churn. Finally, consider annual contracts with discounts to lock in retention.',
  },
  {
    question: 'What is the ideal payback period for SaaS?',
    answer: 'Most healthy SaaS companies target a CAC payback period under 12 months. Enterprise SaaS with higher contract values can tolerate 18-24 months. If your payback period exceeds 18 months, you are tying up capital for too long and should either raise prices, reduce acquisition costs, or improve conversion rates in your funnel.',
  },
  {
    question: 'How do I calculate MRR growth rate?',
    answer: 'MRR growth rate accounts for new MRR (new customers), expansion MRR (upgrades and upsells), and churned MRR (lost customers). The formula is: Growth Rate = ((New MRR + Expansion MRR - Churned MRR) / Starting MRR) x 100. Healthy SaaS companies target 10-20% month-over-month growth in early stages, slowing to 5-10% as they scale.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const mrr = inp.monthlyPrice * inp.customers;
  const arr = mrr * 12;
  const avgLifetimeMonths = inp.monthlyChurnRate > 0 ? 100 / inp.monthlyChurnRate : 0;
  const ltv = inp.monthlyPrice * avgLifetimeMonths * (inp.grossMarginPercent / 100);
  const ltvCacRatio = inp.cacPerCustomer > 0 ? ltv / inp.cacPerCustomer : 0;
  const monthlyChurnedCustomers = inp.customers * inp.monthlyChurnRate / 100;
  const monthlyNewNeeded = monthlyChurnedCustomers;
  const monthlySupportTotal = inp.customers * inp.monthlySupportCost;
  const monthlyProfit = mrr * (inp.grossMarginPercent / 100) - monthlySupportTotal;
  const paybackMonths = (inp.monthlyPrice * inp.grossMarginPercent / 100) > 0
    ? inp.cacPerCustomer / (inp.monthlyPrice * inp.grossMarginPercent / 100)
    : 0;
  return { mrr, arr, avgLifetimeMonths, ltv, ltvCacRatio, monthlyChurnedCustomers, monthlyNewNeeded, monthlySupportTotal, monthlyProfit, paybackMonths };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function SaaSPricingCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalMRR, setGoalMRR] = useState(50000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('saas-pricing-calculator');
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
    saveToLocalStorage('saas-pricing-calculator', inputs);
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
    const mrr = (inp.monthlyPrice || 0) * (inp.customers || 0);
    const supportTotal = (inp.customers || 0) * (inp.monthlySupportCost || 0);
    return mrr * ((inp.grossMarginPercent || 0) / 100) - supportTotal;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    const revenuePerCustomer = inputs.monthlyPrice > 0 ? inputs.monthlyPrice : 1;
    const neededCustomers = Math.ceil(goalMRR / revenuePerCustomer);
    results.push({
      label: 'Increase Customers',
      description: `Grow to ${neededCustomers.toLocaleString()} customers`,
      change: inputs.customers > 0 ? ((neededCustomers - inputs.customers) / inputs.customers) * 100 : 0,
    });
    const neededPrice = inputs.customers > 0 ? goalMRR / inputs.customers : 0;
    results.push({
      label: 'Increase Price',
      description: `Raise price to ${formatCurrency(neededPrice)}/mo`,
      change: inputs.monthlyPrice > 0 ? ((neededPrice - inputs.monthlyPrice) / inputs.monthlyPrice) * 100 : 0,
    });
    const currentMRR = inputs.monthlyPrice * inputs.customers;
    const gap = goalMRR - currentMRR;
    const neededNewCustomers = gap > 0 ? Math.ceil(gap / inputs.monthlyPrice) : 0;
    const neededChurnReduction = inputs.customers > 0 ? (neededNewCustomers / inputs.customers) * 100 : 0;
    const targetChurn = Math.max(0, inputs.monthlyChurnRate - neededChurnReduction);
    results.push({
      label: 'Reduce Churn',
      description: `Reduce churn to ${targetChurn.toFixed(1)}%`,
      change: inputs.monthlyChurnRate > 0 ? ((targetChurn - inputs.monthlyChurnRate) / inputs.monthlyChurnRate) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data - MRR projection over 12 months
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
    datasets: allMetrics.map((s, idx) => {
      const mrrValues: number[] = [];
      let currentCustomers = s.inputs.customers;
      for (let month = 0; month < 12; month++) {
        mrrValues.push(currentCustomers * s.inputs.monthlyPrice);
        const churned = currentCustomers * s.inputs.monthlyChurnRate / 100;
        currentCustomers = currentCustomers - churned + churned;
      }
      return {
        label: s.label,
        data: mrrValues,
        borderColor: scenarioColors[idx],
        backgroundColor: `${scenarioColors[idx]}20`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      };
    }),
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
            return `${ctx.dataset.label}: ${formatCurrency(v ?? 0)}`;
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
    if (m.ltvCacRatio < 1) {
      return {
        status: 'danger',
        title: `LTV:CAC ratio of ${m.ltvCacRatio.toFixed(1)}x means you lose money on every customer acquired.`,
        actions: [
          {
            icon: '\u{1F6A8}',
            text: 'Immediately reduce churn \u2014 focus on onboarding improvements and proactive customer success outreach.',
            affiliateText: 'Analyze competitor retention with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F4B0}', text: 'Raise prices \u2014 your product may be underpriced relative to the value it delivers.' },
          { icon: '\u{1F3AF}', text: 'Lower CAC by focusing on organic channels, referrals, and product-led growth.' },
        ],
      };
    }
    if (m.ltvCacRatio < 3) {
      return {
        status: 'warning',
        title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x is below the 3x benchmark \u2014 room for improvement.`,
        actions: [
          { icon: '\u{1F4CA}', text: 'Implement usage-based health scoring to identify at-risk customers before they churn.' },
          {
            icon: '\u{1F504}',
            text: 'Add expansion revenue paths \u2014 upsells, add-ons, and usage-based pricing increase LTV without additional CAC.',
            affiliateText: 'Research competitor pricing with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F4C8}', text: 'Optimize your acquisition funnel \u2014 improve trial-to-paid conversion to reduce effective CAC.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    if (m.ltvCacRatio < 5) {
      return {
        status: 'good',
        title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x meets the industry benchmark. Solid unit economics.`,
        actions: [
          { icon: '\u{1F680}', text: 'Consider increasing acquisition spend \u2014 your unit economics support more aggressive growth.' },
          {
            icon: '\u{1F3AF}',
            text: 'Expand into adjacent markets or customer segments to scale while maintaining healthy ratios.',
            affiliateText: 'Find new markets with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F4E6}', text: 'Launch premium tiers or enterprise plans to increase ARPU and LTV.', link: '/tools/landing-page-estimator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x is exceptional \u2014 you may be under-investing in growth.`,
      actions: [
        {
          icon: '\u{1F4B8}',
          text: 'Invest heavily in paid acquisition \u2014 your unit economics can support much higher spend.',
          affiliateText: 'Scale paid channels with Semrush',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '\u{1F310}', text: 'Expand internationally \u2014 your margins can absorb the higher CAC of new markets.' },
        { icon: '\u{1F91D}', text: 'Launch a referral or affiliate program to accelerate growth with minimal marginal cost.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">SaaS Pricing Calculator</h1>
        <p className="text-label max-w-2xl">
          Model your SaaS unit economics &mdash; MRR, LTV, CAC payback, and churn impact.
          Drag sliders to simulate pricing and growth scenarios, compare up to three
          strategies side by side, and benchmark your metrics against industry averages.
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
                    &times;
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
          <ScenarioSlider label="Monthly Price" value={inputs.monthlyPrice} min={1} max={999} step={1} prefix="$" onChange={(v) => update('monthlyPrice', v)} benchmarkChips={[{ label: '$19', value: 19 }, { label: '$49', value: 49 }, { label: '$99', value: 99 }, { label: '$199', value: 199 }, { label: '$499', value: 499 }]} />
          <ScenarioSlider label="Number of Customers" value={inputs.customers} min={1} max={50000} step={1} onChange={(v) => update('customers', v)} benchmarkChips={[{ label: '100', value: 100 }, { label: '500', value: 500 }, { label: '1K', value: 1000 }, { label: '5K', value: 5000 }, { label: '10K', value: 10000 }]} />
          <ScenarioSlider label="Monthly Churn Rate" value={inputs.monthlyChurnRate} min={0.1} max={20} step={0.1} suffix="%" benchmark={benchmarks.saas.avg_churn_rate_monthly} benchmarkLabel="Industry avg" onChange={(v) => update('monthlyChurnRate', v)} />

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider label="CAC per Customer" value={inputs.cacPerCustomer} min={1} max={5000} step={1} prefix="$" onChange={(v) => update('cacPerCustomer', v)} benchmarkChips={[{ label: '$50', value: 50 }, { label: '$150', value: 150 }, { label: '$500', value: 500 }, { label: '$1K', value: 1000 }]} />
              <ScenarioSlider label="Monthly Support Cost / User" value={inputs.monthlySupportCost} min={0} max={50} step={0.5} prefix="$" benchmark={benchmarks.saas.avg_support_cost_per_user} benchmarkLabel="Industry avg" onChange={(v) => update('monthlySupportCost', v)} />
              <ScenarioSlider label="Gross Margin" value={inputs.grossMarginPercent} min={10} max={95} step={1} suffix="%" benchmark={benchmarks.saas.avg_gross_margin} benchmarkLabel="Industry avg" onChange={(v) => update('grossMarginPercent', v)} />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="MRR" value={formatCurrency(m.mrr)} subtitle={`ARR: ${formatCurrency(m.arr)}`} color={m.mrr > 0 ? 'green' : 'red'} />
              <KPICard title="LTV:CAC Ratio" value={`${m.ltvCacRatio.toFixed(1)}x`} subtitle={`LTV: ${formatCurrency(m.ltv)}`} color={m.ltvCacRatio >= 3 ? 'green' : m.ltvCacRatio >= 1 ? 'amber' : 'red'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Payback Period" value={`${m.paybackMonths.toFixed(1)} mo`} subtitle={m.paybackMonths <= 12 ? 'Healthy payback' : 'Above 12mo target'} color={m.paybackMonths <= 12 ? 'green' : m.paybackMonths <= 18 ? 'amber' : 'red'} />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">MRR</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.mrr)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">LTV:CAC</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.ltvCacRatio >= 3 ? 'text-success' : 'text-danger'}`}>{s.metrics.ltvCacRatio.toFixed(1)}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Payback</p>
                      <p className="font-mono text-lg font-bold text-foreground">{s.metrics.paybackMonths.toFixed(1)} mo</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="saas-pricing-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">MRR Projection (12 Months)</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge label="Your LTV:CAC vs. Industry Benchmark" value={m.ltvCacRatio} benchmark={benchmarks.saas.avg_ltv_cac_ratio} min={0} max={10} suffix="x" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Analyze competitor pricing" />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="saas-pricing-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target MRR &mdash; How to reach your monthly recurring revenue goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target MRR</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input type="number" value={goalMRR} onChange={(e) => setGoalMRR(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>
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
          <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar inputs={inputs} labels={{ monthlyPrice: 'Monthly Price', customers: 'Customers', monthlyChurnRate: 'Churn Rate', cacPerCustomer: 'CAC', monthlySupportCost: 'Support Cost', grossMarginPercent: 'Gross Margin' }} calculateFn={calcProfit} resultLabel="monthly profit" />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding SaaS Unit Economics</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            SaaS unit economics determine whether your business model is sustainable and scalable.
            The three metrics that matter most are Monthly Recurring Revenue (MRR), the ratio of
            Customer Lifetime Value to Customer Acquisition Cost (LTV:CAC), and the CAC payback
            period. Together, these metrics tell you how much revenue each customer generates, whether
            you can profitably acquire more customers, and how long it takes to recoup your
            acquisition investment.
          </p>
          <p>
            This calculator models the full picture &mdash; from pricing and customer count through churn
            rates and gross margins to LTV, CAC payback, and monthly profit. Unlike simpler MRR
            calculators, it lets you simulate different pricing strategies and compare scenarios side
            by side to find the optimal balance between growth and profitability.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How LTV:CAC Ratio Works</h3>
          <p>
            The LTV:CAC ratio compares the total gross profit a customer generates over their
            lifetime to the cost of acquiring them. A ratio of 3:1 is the widely accepted benchmark
            &mdash; meaning each customer should generate three times more value than they cost to acquire.
            Below 1:1, you are losing money on every customer. Above 5:1, you may be under-investing
            in growth. The formula is LTV = Monthly Price x Average Lifetime Months x Gross Margin,
            then LTV:CAC = LTV / CAC. To benchmark your SaaS metrics against competitors in your space, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides competitive intelligence to help you price strategically and position your product</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">The Impact of Churn on SaaS Growth</h3>
          <p>
            Churn is the silent killer of SaaS businesses. A 5% monthly churn rate means you lose
            half your customers every year and must replace them just to maintain flat revenue. Reducing
            churn from 5% to 3% increases average customer lifetime from 20 months to 33 months &mdash; a
            65% increase in LTV with zero additional acquisition cost. This is why the most successful
            SaaS companies obsess over retention before scaling acquisition. For competitive intelligence on how leading SaaS companies in your space retain customers, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s market analysis tools to research competitor strategies</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing Your Pricing Strategy</h3>
          <p>
            Most SaaS companies underprice their product. A 10% price increase with no change in
            churn or acquisition flows directly to the bottom line and increases both MRR and LTV
            proportionally. Use the scenario comparison feature in this calculator to model the impact
            of price changes on your unit economics. Test different price points, compare the resulting
            LTV:CAC ratios, and find the sweet spot where you maximize revenue without increasing churn.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="saas-pricing-calculator" />
      <PreRelatedCTA toolSlug="saas-pricing-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="saas-pricing-calculator" />
    </div>
  );
}
