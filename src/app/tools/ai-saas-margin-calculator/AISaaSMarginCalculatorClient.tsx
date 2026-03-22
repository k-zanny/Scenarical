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
import { formatCurrency, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyPrice: 49,
  customers: 500,
  avgQueriesPerCustomer: 100,
  avgInputTokensPerQuery: 1500,
  avgOutputTokensPerQuery: 500,
  llmInputCostPer1M: 3.00,
  llmOutputCostPer1M: 15.00,
  infraCostPerCustomer: 2,
  supportCostPerCustomer: 3,
  otherCOGSPercent: 5,
};

type Inputs = typeof defaults;

interface Scenario { id: string; label: string; inputs: Inputs; }

/* ================================================================== */
/*  FAQs                                                               */
/* ================================================================== */
const faqs = [
  {
    question: 'What is a good gross margin for an AI SaaS product?',
    answer: 'The average gross margin for AI SaaS companies is around 65%, compared to 70-80% for traditional SaaS. LLM inference costs are the primary reason for the gap. Top-performing AI SaaS companies achieve 70%+ margins through aggressive model optimization, tiered pricing, and smart model routing that uses cheaper models for routine tasks.',
  },
  {
    question: 'How do I reduce LLM costs as a percentage of revenue?',
    answer: 'Three main strategies: (1) Route simple queries to cheaper models while reserving expensive models for complex tasks, (2) Implement response caching to avoid redundant API calls, and (3) Optimize prompts to reduce token usage. Combined, these can cut LLM costs by 50-70% without noticeable quality degradation for most use cases.',
  },
  {
    question: 'Should I charge per-query or a flat monthly subscription?',
    answer: 'Flat subscriptions are simpler for users but create margin risk if usage varies widely. Usage-based pricing aligns costs with revenue but can suppress adoption. The most common approach is a tiered subscription with usage caps, where each tier has a query limit and overage charges. This provides revenue predictability while protecting margins on heavy users.',
  },
  {
    question: 'How do I benchmark my AI SaaS unit economics?',
    answer: 'Key metrics to track: LLM cost as % of revenue (target under 20%), gross margin (target 65%+), cost per user (track monthly), and queries per user (monitor for usage spikes). Compare your LLM cost percentage against the 35% COGS benchmark for AI SaaS. If LLM costs exceed 30% of revenue, you likely need to optimize your model selection or pricing.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const mrr = inp.monthlyPrice * inp.customers;
  const totalMonthlyQueries = inp.customers * inp.avgQueriesPerCustomer;
  const monthlyInputTokens = totalMonthlyQueries * inp.avgInputTokensPerQuery;
  const monthlyOutputTokens = totalMonthlyQueries * inp.avgOutputTokensPerQuery;
  const llmCost = (monthlyInputTokens / 1e6) * inp.llmInputCostPer1M + (monthlyOutputTokens / 1e6) * inp.llmOutputCostPer1M;
  const infraCost = inp.customers * inp.infraCostPerCustomer;
  const supportCost = inp.customers * inp.supportCostPerCustomer;
  const otherCOGS = mrr * inp.otherCOGSPercent / 100;
  const totalCOGS = llmCost + infraCost + supportCost + otherCOGS;
  const grossProfit = mrr - totalCOGS;
  const grossMargin = mrr > 0 ? (grossProfit / mrr) * 100 : 0;
  const llmCostPercent = mrr > 0 ? (llmCost / mrr) * 100 : 0;
  const costPerUser = inp.customers > 0 ? totalCOGS / inp.customers : 0;

  return { mrr, totalMonthlyQueries, monthlyInputTokens, monthlyOutputTokens, llmCost, infraCost, supportCost, otherCOGS, totalCOGS, grossProfit, grossMargin, llmCostPercent, costPerUser };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function AISaaSMarginCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalMargin, setGoalMargin] = useState(70);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('ai-saas-margin-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('ai-saas-margin-calculator', inputs); }, [inputs]);

  const update = (key: keyof Inputs, value: number) => {
    setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s));
  };

  const resetDefaults = () => {
    setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...defaults } } : s));
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

  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  const calcProfit = useCallback((inp: Record<string, number>) => {
    const rev = (inp.monthlyPrice || 0) * (inp.customers || 0);
    const queries = (inp.customers || 0) * (inp.avgQueriesPerCustomer || 0);
    const llm = ((queries * (inp.avgInputTokensPerQuery || 0)) / 1e6) * (inp.llmInputCostPer1M || 0) +
      ((queries * (inp.avgOutputTokensPerQuery || 0)) / 1e6) * (inp.llmOutputCostPer1M || 0);
    const infra = (inp.customers || 0) * (inp.infraCostPerCustomer || 0);
    const support = (inp.customers || 0) * (inp.supportCostPerCustomer || 0);
    const other = rev * (inp.otherCOGSPercent || 0) / 100;
    return rev - llm - infra - support - other;
  }, []);

  // Reverse goal
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    const targetCOGSPercent = 100 - goalMargin;
    const targetTotalCOGS = m.mrr * targetCOGSPercent / 100;
    // Path 1: Increase price
    const neededPrice = m.totalCOGS > 0 ? m.totalCOGS / (inputs.customers * (1 - goalMargin / 100)) : inputs.monthlyPrice;
    results.push({ label: 'Increase Price', description: `Raise price to ${formatCurrency(neededPrice)}/mo`, change: inputs.monthlyPrice > 0 ? ((neededPrice - inputs.monthlyPrice) / inputs.monthlyPrice) * 100 : 0 });
    // Path 2: Reduce LLM costs
    const maxLLMCost = targetTotalCOGS - m.infraCost - m.supportCost - m.otherCOGS;
    const llmReduction = m.llmCost > 0 ? ((m.llmCost - Math.max(0, maxLLMCost)) / m.llmCost) * 100 : 0;
    results.push({ label: 'Cut LLM Costs', description: `Reduce LLM spend by ${llmReduction.toFixed(0)}%`, change: -llmReduction });
    // Path 3: Reduce queries per user
    const currentLLMPerQuery = m.totalMonthlyQueries > 0 ? m.llmCost / m.totalMonthlyQueries : 0;
    const maxQueries = currentLLMPerQuery > 0 ? Math.max(0, maxLLMCost) / currentLLMPerQuery : 0;
    const neededQueriesPerUser = inputs.customers > 0 ? Math.floor(maxQueries / inputs.customers) : 0;
    results.push({ label: 'Limit Usage', description: `Cap at ${neededQueriesPerUser} queries/user/mo`, change: inputs.avgQueriesPerCustomer > 0 ? ((neededQueriesPerUser - inputs.avgQueriesPerCustomer) / inputs.avgQueriesPerCustomer) * 100 : 0 });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Gross Profit', 'LLM Cost', 'Infrastructure', 'Support', 'Other COGS'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.grossProfit, s.metrics.llmCost, s.metrics.infraCost, s.metrics.supportCost, s.metrics.otherCOGS],
      backgroundColor: [
        '#22C55EB3',
        '#EF4444B3',
        '#F97316B3',
        '#A855F7B3',
        '#6B7280B3',
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
        backgroundColor: '#141926', borderColor: '#283044', borderWidth: 1, titleColor: '#E8ECF4', bodyColor: '#94A3B8',
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const v = ctx.raw as number;
            const pct = m.mrr > 0 ? ((v / m.mrr) * 100).toFixed(1) : '0';
            return `${ctx.dataset.label}: ${formatCurrency(v)} (${pct}% of MRR)`;
          },
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8' } },
      y: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', callback: (v: string | number) => '$' + Number(v).toLocaleString() } },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.grossMargin < 40) {
      return { status: 'danger', title: `Gross margin of ${m.grossMargin.toFixed(0)}% is critically low for SaaS. LLM costs are consuming ${m.llmCostPercent.toFixed(0)}% of revenue.`, actions: [
        { icon: '\uD83D\uDCA1', text: 'Switch to a budget-tier LLM for routine queries. Model routing can cut LLM costs by 50-70%.', affiliateText: 'Optimize your AI SaaS with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDCB0', text: 'Raise your subscription price. Your product delivers AI value that justifies premium pricing.' },
        { icon: '\u2702\uFE0F', text: 'Implement usage tiers or query caps to prevent margin-destroying power users.' },
        { icon: '\uD83D\uDCBE', text: 'Cache frequent responses. Even 20% cache hit rate directly improves margins.' },
      ] };
    }
    if (m.grossMargin < 60) {
      return { status: 'warning', title: `Gross margin of ${m.grossMargin.toFixed(0)}% is below the 65% AI SaaS average. Room to optimize.`, actions: [
        { icon: '\uD83D\uDCCA', text: 'Analyze per-user economics. Identify power users and consider usage-based pricing tiers.' },
        { icon: '\uD83E\uDDEA', text: 'A/B test cheaper models on subsets of queries to find quality-cost sweet spots.', affiliateText: 'Research your market with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDD04', text: 'Optimize prompts to reduce token count. Shorter, more focused prompts often perform equally well.' },
        { icon: '\uD83D\uDCC8', text: 'Consider annual pricing with a discount to improve cash flow and reduce churn impact.' },
      ] };
    }
    if (m.grossMargin < 75) {
      return { status: 'good', title: `Gross margin of ${m.grossMargin.toFixed(0)}% meets or exceeds the AI SaaS benchmark of 65%.`, actions: [
        { icon: '\uD83D\uDCC8', text: 'Focus on growth. Your unit economics support aggressive customer acquisition.' },
        { icon: '\uD83D\uDD0D', text: 'Consider adding premium AI features that use more capable (expensive) models at a higher price tier.', affiliateText: 'Grow your AI SaaS with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDE80', text: 'Invest in product-led growth. Strong margins mean you can afford generous free tiers.' },
        { icon: '\uD83D\uDCDA', text: 'Build competitive moats through proprietary data and fine-tuned models.' },
      ] };
    }
    return { status: 'excellent', title: `Gross margin of ${m.grossMargin.toFixed(0)}% is exceptional for AI SaaS. Your unit economics are best-in-class.`, actions: [
      { icon: '\uD83D\uDE80', text: 'Scale aggressively. Your margins can absorb significant customer acquisition costs.', affiliateText: 'Scale your marketing with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\uD83E\uDDE0', text: 'Experiment with more capable models for premium features to increase perceived value.' },
      { icon: '\uD83C\uDF10', text: 'Consider international expansion. Your margin structure supports localization costs.' },
      { icon: '\uD83D\uDCE6', text: 'Explore enterprise pricing tiers with higher prices and dedicated support.' },
    ] };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">AI SaaS Margin Calculator</h1>
        <p className="text-label max-w-2xl">
          Model the gross margins of your AI-powered SaaS product. Calculate how LLM costs,
          infrastructure, and support expenses affect your unit economics &mdash; and find the
          pricing and cost structure that maximizes profitability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map((s) => (
              <button key={s.id} onClick={() => setActiveScenario(s.id)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeScenario === s.id ? 'bg-accent text-white' : 'text-label hover:text-foreground'}`}>
                {s.label}
                {s.id !== 'A' && (<span onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} className="ml-1.5 text-white/60 hover:text-white">&times;</span>)}
              </button>
            ))}
            {scenarios.length < 3 && (<button onClick={addScenario} className="text-sm text-accent hover:text-accent-hover px-3 py-1.5 border border-accent/30 rounded-lg transition-colors">+ Add Scenario {String.fromCharCode(65 + scenarios.length)}</button>)}
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>

          <ScenarioSlider label="Monthly Price per User" value={inputs.monthlyPrice} min={5} max={500} step={1} prefix="$" onChange={(v) => update('monthlyPrice', v)} benchmarkChips={[{ label: '$29', value: 29 }, { label: '$49', value: 49 }, { label: '$99', value: 99 }, { label: '$199', value: 199 }]} />
          <ScenarioSlider label="Number of Customers" value={inputs.customers} min={10} max={50000} step={10} onChange={(v) => update('customers', v)} benchmarkChips={[{ label: '100', value: 100 }, { label: '500', value: 500 }, { label: '2K', value: 2000 }, { label: '10K', value: 10000 }]} />
          <ScenarioSlider label="Avg Queries / Customer / Month" value={inputs.avgQueriesPerCustomer} min={1} max={1000} step={1} onChange={(v) => update('avgQueriesPerCustomer', v)} benchmarkChips={[{ label: '50', value: 50 }, { label: '100', value: 100 }, { label: '500', value: 500 }]} />

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider label="Avg Input Tokens / Query" value={inputs.avgInputTokensPerQuery} min={100} max={10000} step={100} onChange={(v) => update('avgInputTokensPerQuery', v)} />
              <ScenarioSlider label="Avg Output Tokens / Query" value={inputs.avgOutputTokensPerQuery} min={50} max={4000} step={50} onChange={(v) => update('avgOutputTokensPerQuery', v)} />
              <ScenarioSlider label="LLM Input Cost ($/1M tokens)" value={inputs.llmInputCostPer1M} min={0.05} max={20} step={0.05} prefix="$" onChange={(v) => update('llmInputCostPer1M', v)} />
              <ScenarioSlider label="LLM Output Cost ($/1M tokens)" value={inputs.llmOutputCostPer1M} min={0.10} max={80} step={0.10} prefix="$" onChange={(v) => update('llmOutputCostPer1M', v)} />
              <ScenarioSlider label="Infra Cost / Customer / Mo" value={inputs.infraCostPerCustomer} min={0} max={20} step={0.5} prefix="$" onChange={(v) => update('infraCostPerCustomer', v)} />
              <ScenarioSlider label="Support Cost / Customer / Mo" value={inputs.supportCostPerCustomer} min={0} max={20} step={0.5} prefix="$" onChange={(v) => update('supportCostPerCustomer', v)} />
              <ScenarioSlider label="Other COGS (% of Revenue)" value={inputs.otherCOGSPercent} min={0} max={30} step={1} suffix="%" onChange={(v) => update('otherCOGSPercent', v)} />
            </div>
          )}
        </div>

        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Gross Margin" value={`${m.grossMargin.toFixed(1)}%`} subtitle={`${formatCurrency(m.costPerUser)}/user COGS`} color={m.grossMargin >= 65 ? 'green' : m.grossMargin >= 50 ? 'amber' : 'red'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="LLM Cost % of Rev" value={`${m.llmCostPercent.toFixed(1)}%`} subtitle={`${formatCurrency(m.llmCost)} total LLM`} color={m.llmCostPercent <= 20 ? 'green' : m.llmCostPercent <= 35 ? 'amber' : 'red'} />
              <KPICard title="Monthly Gross Profit" value={formatCurrency(m.grossProfit)} subtitle={`${formatCurrency(m.mrr)} MRR`} color={m.grossProfit > 0 ? 'green' : 'red'} />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><p className="text-[10px] text-muted uppercase">Gross Margin</p><p className={`font-mono text-lg font-bold ${s.metrics.grossMargin >= 65 ? 'text-success' : 'text-danger'}`}>{s.metrics.grossMargin.toFixed(1)}%</p></div>
                    <div><p className="text-[10px] text-muted uppercase">LLM Cost %</p><p className="font-mono text-lg font-bold text-foreground">{s.metrics.llmCostPercent.toFixed(1)}%</p></div>
                    <div><p className="text-[10px] text-muted uppercase">Gross Profit</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.grossProfit)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="ai-saas-margin-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">MRR Breakdown</h3>
            <div className="h-80 sm:h-96"><Bar data={chartData} options={chartOptions} /></div>
          </div>

          <BenchmarkGauge label="Your Gross Margin vs. AI SaaS Average" value={m.grossMargin} benchmark={benchmarks.ai_llm.avg_ai_saas_gross_margin} min={0} max={100} suffix="%" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Grow your AI SaaS" />

          <div className="flex gap-3 mt-4"><ShareButton slug="ai-saas-margin-calculator" inputs={inputs} /></div>
        </div>
      </div>

      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Margin Target &mdash; How to reach your gross margin goal</h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Gross Margin</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" value={goalMargin} onChange={(e) => setGoalMargin(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
              <span className="text-label">%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Smallest change needed</span>}
                <h4 className="text-sm font-semibold text-foreground mt-1">{scenario.label}</h4>
                <p className="text-xs text-label mt-1">{scenario.description}</p>
                <p className="text-xs font-mono mt-2 text-label">Change: <span className={scenario.change > 0 ? 'text-danger' : 'text-success'}>{scenario.change > 0 ? '+' : ''}{scenario.change.toFixed(1)}%</span></p>
              </div>
            ))}
          </div>
          <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
        </div>
      )}

      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      <RiskRadar inputs={inputs} labels={{ monthlyPrice: 'Price', customers: 'Customers', avgQueriesPerCustomer: 'Queries/User', avgInputTokensPerQuery: 'Input Tokens', avgOutputTokensPerQuery: 'Output Tokens', llmInputCostPer1M: 'LLM Input $', llmOutputCostPer1M: 'LLM Output $', infraCostPerCustomer: 'Infra/User', supportCostPerCustomer: 'Support/User', otherCOGSPercent: 'Other COGS %' }} calculateFn={calcProfit} resultLabel="monthly gross profit" />

      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding AI SaaS Margins and Unit Economics</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>AI-powered SaaS products face a fundamentally different cost structure than traditional software. While traditional SaaS enjoys gross margins of 70-80% thanks to near-zero marginal costs, AI SaaS companies must pay for LLM inference on every user query. This variable cost component means that usage directly impacts margins, making unit economics a critical strategic concern rather than an afterthought.</p>
          <p>The average AI SaaS company operates at roughly 65% gross margins, with LLM costs typically consuming 15-35% of revenue. The spread is enormous: well-optimized products achieve 75%+ margins while poorly optimized ones struggle below 50%. The difference comes down to three factors: model selection (cheap vs. expensive models), usage patterns (queries per user), and pricing strategy (how much you charge relative to your AI costs).</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">LLM Cost Management Strategies</h3>
          <p>The highest-leverage optimization is model routing: automatically directing simple queries to budget models (like GPT-4.1-nano at $0.10/1M input) while routing complex queries to flagship models. This alone can reduce LLM costs by 50-70%. Response caching, prompt optimization, and usage-based pricing tiers are additional levers. For AI SaaS companies looking to acquire customers efficiently, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides the competitive intelligence to market your AI product to the right audience at the right cost</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Pricing for Profitability</h3>
          <p>Many AI SaaS founders underprice their products because they anchor to traditional SaaS pricing without accounting for AI inference costs. Your price needs to cover not just fixed costs but the variable per-query costs that scale with usage. The risk radar above shows which inputs most impact your profitability &mdash; use it to identify whether you have a pricing problem, a cost problem, or a usage problem. For data-driven pricing decisions, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush helps you analyze competitor pricing and positioning to find your optimal price point</a>.</p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="ai-saas-margin-calculator" />
      <PreRelatedCTA toolSlug="ai-saas-margin-calculator" />
      <RelatedTools currentSlug="ai-saas-margin-calculator" />
    </div>
  );
}
