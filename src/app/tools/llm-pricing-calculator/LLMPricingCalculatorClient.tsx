'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
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
import llmPricing from '@/data/llm-pricing.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const defaults = { monthlyQueries: 10000, avgInputTokens: 1500, avgOutputTokens: 500 };
type Inputs = typeof defaults & { selectedModel: string };
const popularModels = ['claude-sonnet-4', 'gpt-4o', 'gpt-4.1-mini', 'gemini-2.5-pro', 'gemini-2.5-flash', 'deepseek-v3'] as const;
interface Scenario { id: string; label: string; inputs: Inputs; }

const faqs = [
  { question: 'How is LLM API pricing calculated?', answer: 'LLM providers charge per token processed. Tokens are sub-word units \u2014 roughly 1 token per 0.75 words for English text. Pricing is split into input tokens (your prompt) and output tokens (the model response), with output tokens typically costing 2-5x more. Your total cost equals (input tokens / 1M * input price) + (output tokens / 1M * output price) per query, multiplied by your query volume.' },
  { question: 'Which LLM model offers the best value?', answer: 'It depends on your use case. For high-volume, low-complexity tasks like classification or extraction, budget models like GPT-4.1-mini, Gemini 2.5 Flash, or DeepSeek V3 offer excellent quality at a fraction of flagship pricing. For complex reasoning, coding, or creative tasks, flagship models like Claude Sonnet 4, GPT-4o, or Gemini 2.5 Pro deliver better results despite higher per-token costs.' },
  { question: 'How can I reduce my LLM API costs?', answer: 'The most effective strategies are: (1) prompt optimization \u2014 shorter prompts that still produce good results, (2) model routing \u2014 using cheaper models for simple tasks, (3) caching \u2014 storing responses for repeated queries, (4) batching \u2014 grouping requests to reduce overhead, and (5) output length control \u2014 setting max_tokens to prevent unnecessarily long responses.' },
  { question: 'What is the difference between input and output token pricing?', answer: 'Input tokens are the tokens in your prompt (system instructions, user query, context). Output tokens are the tokens the model generates in response. Output tokens cost more because they require sequential generation \u2014 each token depends on the previous one. For most models, output pricing is 3-5x the input pricing, meaning controlling response length is one of the biggest levers for cost reduction.' },
];

function computeMetrics(inp: Inputs) {
  const models = llmPricing.models as Record<string, { provider: string; input_per_1m: number; output_per_1m: number; context_window: number; category: string }>;
  const model = models[inp.selectedModel];
  if (!model) return { inputCost: 0, outputCost: 0, totalMonthlyCost: 0, annualCost: 0, costPerQuery: 0, costPer1000Queries: 0, allModelCosts: {} as Record<string, number> };
  const inputCost = (inp.monthlyQueries * inp.avgInputTokens / 1000000) * model.input_per_1m;
  const outputCost = (inp.monthlyQueries * inp.avgOutputTokens / 1000000) * model.output_per_1m;
  const totalMonthlyCost = inputCost + outputCost;
  const annualCost = totalMonthlyCost * 12;
  const costPerQuery = inp.monthlyQueries > 0 ? totalMonthlyCost / inp.monthlyQueries : 0;
  const costPer1000Queries = costPerQuery * 1000;
  const allModelCosts: Record<string, number> = {};
  for (const [key, md] of Object.entries(models)) {
    allModelCosts[key] = (inp.monthlyQueries * inp.avgInputTokens / 1000000) * md.input_per_1m + (inp.monthlyQueries * inp.avgOutputTokens / 1000000) * md.output_per_1m;
  }
  return { inputCost, outputCost, totalMonthlyCost, annualCost, costPerQuery, costPer1000Queries, allModelCosts };
}

export default function LLMPricingCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([{ id: 'A', label: 'Scenario A', inputs: { ...defaults, selectedModel: 'claude-sonnet-4' } }]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalBudget, setGoalBudget] = useState(500);
  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('llm-pricing-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, selectedModel: 'claude-sonnet-4', ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Record<string, string | number> = {};
    params.forEach((v, k) => { if (k === 'selectedModel') urlInputs[k] = v; else if (k in defaults) urlInputs[k] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } as Inputs }]);
  }, []);
  useEffect(() => { saveToLocalStorage('llm-pricing-calculator', inputs as unknown as Record<string, number>); }, [inputs]);

  const update = (key: keyof Inputs, value: number | string) => setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s));
  const resetDefaults = () => setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...defaults, selectedModel: 'claude-sonnet-4' } } : s));
  const addScenario = () => { if (scenarios.length >= 3) return; const nid = String.fromCharCode(65 + scenarios.length); setScenarios(prev => [...prev, { id: nid, label: `Scenario ${nid}`, inputs: { ...inputs } }]); setActiveScenario(nid); };
  const removeScenario = (id: string) => { if (id === 'A') return; setScenarios(prev => prev.filter(s => s.id !== id)); setActiveScenario('A'); };

  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  const calcCost = useCallback((inp: Record<string, number>) => {
    const mdls = llmPricing.models as Record<string, { input_per_1m: number; output_per_1m: number }>;
    const mdl = mdls['claude-sonnet-4'];
    if (!mdl) return 0;
    return -((inp.monthlyQueries || 0) * (inp.avgInputTokens || 0) / 1000000 * mdl.input_per_1m + (inp.monthlyQueries || 0) * (inp.avgOutputTokens || 0) / 1000000 * mdl.output_per_1m);
  }, []);

  const reverseScenarios = isReverse ? (() => {
    const results: Array<{label: string; description: string; change: number}> = [];
    const neededQ = m.costPerQuery > 0 ? Math.floor(goalBudget / m.costPerQuery) : 0;
    results.push({ label: 'Reduce Query Volume', description: `Limit to ${formatNumber(neededQ)} queries/month`, change: inputs.monthlyQueries > 0 ? ((neededQ - inputs.monthlyQueries) / inputs.monthlyQueries) * 100 : 0 });
    const mdls = llmPricing.models as Record<string, { input_per_1m: number; output_per_1m: number }>;
    const mdl = mdls[inputs.selectedModel];
    if (mdl) {
      const oc = (inputs.monthlyQueries * inputs.avgOutputTokens / 1000000) * mdl.output_per_1m;
      const rem = goalBudget - oc;
      const nit = rem > 0 && inputs.monthlyQueries > 0 && mdl.input_per_1m > 0 ? Math.floor((rem / mdl.input_per_1m) * 1000000 / inputs.monthlyQueries) : 0;
      results.push({ label: 'Shorten Prompts', description: `Reduce avg input to ${formatNumber(Math.max(0, nit))} tokens`, change: inputs.avgInputTokens > 0 ? ((nit - inputs.avgInputTokens) / inputs.avgInputTokens) * 100 : 0 });
    }
    const sorted = Object.entries(m.allModelCosts).sort((a, b) => a[1] - b[1]);
    if (sorted[0]) results.push({ label: 'Switch Model', description: `Use ${sorted[0][0]} at ${formatCurrency(sorted[0][1])}/mo`, change: m.totalMonthlyCost > 0 ? ((sorted[0][1] - m.totalMonthlyCost) / m.totalMonthlyCost) * 100 : 0 });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const sortedModels = Object.entries(m.allModelCosts).sort((a, b) => a[1] - b[1]);
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const chartData = { labels: sortedModels.map(([n]) => n), datasets: [{ label: 'Monthly Cost', data: sortedModels.map(([, c]) => c), backgroundColor: sortedModels.map(([n]) => n === inputs.selectedModel ? '#3B82F6' : '#3B82F640'), borderColor: sortedModels.map(([n]) => n === inputs.selectedModel ? '#3B82F6' : '#3B82F680'), borderWidth: 1, borderRadius: 6 }] };
  const chartOptions = {
    responsive: true, indexAxis: 'y' as const, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#141926', borderColor: '#283044', borderWidth: 1, titleColor: '#E8ECF4', bodyColor: '#94A3B8',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callbacks: { label: (ctx: any) => `${formatCurrency(ctx.raw as number)}/month` } } },
    scales: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      x: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', callback: (v: any) => formatCurrency(Number(v)) } },
      y: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', font: { size: 10 } } },
    },
  };

  const allCosts = Object.values(m.allModelCosts);
  const avgCostPerQuery = allCosts.length > 0 && inputs.monthlyQueries > 0 ? (allCosts.reduce((a, b) => a + b, 0) / allCosts.length) / inputs.monthlyQueries : 0;

  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.totalMonthlyCost > 10000) return { status: 'danger', title: `Monthly LLM cost of ${formatCurrency(m.totalMonthlyCost)} is very high \u2014 optimization is critical.`, actions: [
      { icon: '\u{1F500}', text: 'Implement model routing \u2014 use cheaper models for simple tasks and reserve expensive models for complex reasoning.', affiliateText: 'Optimize your AI stack with Semrush data', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{2702}\u{FE0F}', text: 'Audit your prompts \u2014 most can be shortened 30-50% without quality loss by removing redundant instructions.' },
      { icon: '\u{1F4BE}', text: 'Implement response caching for repeated or similar queries to avoid paying for the same generation twice.' },
    ] };
    if (m.totalMonthlyCost > 2000) return { status: 'warning', title: `Monthly cost of ${formatCurrency(m.totalMonthlyCost)} is significant \u2014 there is room to optimize.`, actions: [
      { icon: '\u{1F4CA}', text: 'Benchmark your cost per query against alternatives. Switching models can save 50-80% with minimal quality impact.' },
      { icon: '\u{1F3AF}', text: 'Set max_tokens on API calls to prevent unnecessarily long responses.', affiliateText: 'Build smarter AI workflows with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F504}', text: 'Use streaming responses and early termination when possible to reduce wasted output tokens.' },
    ] };
    if (m.totalMonthlyCost > 200) return { status: 'good', title: `Monthly cost of ${formatCurrency(m.totalMonthlyCost)} is manageable \u2014 focus on scaling efficiently.`, actions: [
      { icon: '\u{1F4C8}', text: 'Monitor cost per query as you scale. Volume discounts and batch APIs can reduce costs at higher throughput.' },
      { icon: '\u{1F9EA}', text: 'A/B test model quality \u2014 smaller models may produce equivalent results for your use case.', affiliateText: 'Power your AI marketing with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F527}', text: 'Invest in prompt engineering \u2014 well-structured prompts reduce tokens while improving quality.' },
    ] };
    return { status: 'excellent', title: `Monthly cost of ${formatCurrency(m.totalMonthlyCost)} is very efficient \u2014 you are well-optimized.`, actions: [
      { icon: '\u{1F680}', text: 'Consider upgrading to a more capable model \u2014 at this volume, the quality difference may justify the cost.', affiliateText: 'Scale your AI-powered marketing with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F4E6}', text: 'Explore fine-tuning \u2014 at low volumes, a fine-tuned smaller model can deliver flagship quality at budget pricing.' },
      { icon: '\u{1F310}', text: 'Add more AI features to your product. At this cost level, AI is a high-ROI investment.' },
    ] };
  };
  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">LLM API Pricing Calculator</h1>
        <p className="text-label max-w-2xl">Compare API costs across every major LLM model. Adjust your query volume and token usage to see real-time monthly and annual cost projections, find the cheapest model for your workload, and share your analysis with your team.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map((s) => (<button key={s.id} onClick={() => setActiveScenario(s.id)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeScenario === s.id ? 'bg-accent text-white' : 'text-label hover:text-foreground'}`}>{s.label}{s.id !== 'A' && <span onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} className="ml-1.5 text-white/60 hover:text-white">{'\u00D7'}</span>}</button>))}
            {scenarios.length < 3 && <button onClick={addScenario} className="text-sm text-accent hover:text-accent-hover px-3 py-1.5 border border-accent/30 rounded-lg transition-colors">+ Add Scenario {String.fromCharCode(65 + scenarios.length)}</button>}
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>
          <div className="mb-5">
            <label className="text-sm font-medium text-label block mb-2">Select Model</label>
            <div className="flex flex-wrap gap-2">
              {popularModels.map((mk) => { const md = (llmPricing.models as Record<string, { provider: string }>)[mk]; return (
                <button key={mk} onClick={() => update('selectedModel', mk)} className={`text-xs px-3 py-2 rounded-lg border transition-colors ${inputs.selectedModel === mk ? 'bg-accent text-white border-accent' : 'bg-surface-light text-label border-surface-lighter hover:border-accent/50'}`}>
                  <span className="font-medium">{mk}</span>{md && <span className="block text-[10px] opacity-70 mt-0.5">{md.provider}</span>}
                </button>); })}
            </div>
          </div>
          <ScenarioSlider label="Monthly Queries" value={inputs.monthlyQueries} min={100} max={1000000} step={100} onChange={(v) => update('monthlyQueries', v)} benchmarkChips={[{ label: '1K', value: 1000 }, { label: '10K', value: 10000 }, { label: '100K', value: 100000 }, { label: '500K', value: 500000 }]} />
          <ScenarioSlider label="Avg Input Tokens per Query" value={inputs.avgInputTokens} min={50} max={10000} step={50} benchmark={benchmarks.ai_llm.avg_tokens_per_query} benchmarkLabel="Typical avg" onChange={(v) => update('avgInputTokens', v)} />
          <ScenarioSlider label="Avg Output Tokens per Query" value={inputs.avgOutputTokens} min={10} max={5000} step={10} benchmark={benchmarks.ai_llm.avg_tokens_per_response} benchmarkLabel="Typical avg" onChange={(v) => update('avgOutputTokens', v)} />
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Details
          </button>
          {showAdvanced && (<div className="border-t border-surface-lighter pt-4"><div className="bg-surface-light rounded-lg p-4 text-xs text-label space-y-2">
            {(() => { const mdls = llmPricing.models as Record<string, { provider: string; input_per_1m: number; output_per_1m: number; context_window: number; category: string }>; const mdl = mdls[inputs.selectedModel]; if (!mdl) return <p>Model not found.</p>; return (<><p><span className="text-foreground font-medium">{inputs.selectedModel}</span> by {mdl.provider}</p><p>Input: {formatCurrency(mdl.input_per_1m)} per 1M tokens | Output: {formatCurrency(mdl.output_per_1m)} per 1M tokens</p><p>Context window: {formatNumber(mdl.context_window)} tokens | Category: {mdl.category}</p><p className="pt-2 border-t border-surface-lighter">Total input tokens/mo: {formatNumber(inputs.monthlyQueries * inputs.avgInputTokens)} | Total output tokens/mo: {formatNumber(inputs.monthlyQueries * inputs.avgOutputTokens)}</p></>); })()}
          </div></div>)}
        </div>
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Monthly Cost" value={formatCurrency(m.totalMonthlyCost)} subtitle={`${formatCurrency(m.inputCost)} input + ${formatCurrency(m.outputCost)} output`} color={m.totalMonthlyCost < 500 ? 'green' : m.totalMonthlyCost < 5000 ? 'amber' : 'red'} />
              <KPICard title="Cost per Query" value={m.costPerQuery < 0.01 ? `$${m.costPerQuery.toFixed(4)}` : formatCurrency(m.costPerQuery, 3)} subtitle={`${formatCurrency(m.costPer1000Queries)} per 1K queries`} color="blue" clickable onGoalSubmit={() => setIsReverse(!isReverse)} />
              <KPICard title="Annual Cost" value={formatCurrency(m.annualCost)} subtitle={`${formatNumber(inputs.monthlyQueries * 12)} queries/year`} color={m.annualCost < 5000 ? 'green' : m.annualCost < 50000 ? 'amber' : 'red'} />
            </div>
          ) : (<div className="space-y-3 mb-6">{allMetrics.map((s, idx) => (<div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3"><p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label} &mdash; {s.inputs.selectedModel}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><p className="text-[10px] text-muted uppercase">Monthly Cost</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.totalMonthlyCost)}</p></div><div><p className="text-[10px] text-muted uppercase">Cost/Query</p><p className="font-mono text-lg font-bold text-foreground">{s.metrics.costPerQuery < 0.01 ? `$${s.metrics.costPerQuery.toFixed(4)}` : formatCurrency(s.metrics.costPerQuery, 3)}</p></div><div><p className="text-[10px] text-muted uppercase">Annual</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.annualCost)}</p></div></div></div>))}</div>)}
          <PostKPICTA toolSlug="llm-pricing-calculator" />
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6"><h3 className="text-sm font-medium text-label mb-3">Monthly Cost by Model</h3><div className="h-[500px]"><Bar data={chartData} options={chartOptions} /></div></div>
          <BenchmarkGauge label="Your Cost per Query vs. All-Model Average" value={m.costPerQuery} benchmark={avgCostPerQuery} min={0} max={avgCostPerQuery * 3} prefix="$" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Optimize your AI marketing costs" />
          <div className="flex gap-3 mt-4"><ShareButton slug="llm-pricing-calculator" inputs={inputs as unknown as Record<string, number>} /></div>
        </div>
      </div>
      {isReverse && (<div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Budget Target &mdash; How to stay within your monthly budget</h3>
        <div className="mb-4"><label className="text-sm text-label">Target Monthly Budget</label><div className="flex items-center gap-2 mt-1"><span className="text-label">$</span><input type="number" value={goalBudget} onChange={(e) => setGoalBudget(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{reverseScenarios.map((sc, i) => (<div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>{i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Smallest change needed</span>}<h4 className="text-sm font-semibold text-foreground mt-1">{sc.label}</h4><p className="text-xs text-label mt-1">{sc.description}</p><p className="text-xs font-mono mt-2 text-label">Change: <span className={sc.change > 0 ? 'text-danger' : 'text-success'}>{sc.change > 0 ? '+' : ''}{sc.change.toFixed(1)}%</span></p></div>))}</div>
        <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
      </div>)}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />
      <RiskRadar inputs={{ monthlyQueries: inputs.monthlyQueries, avgInputTokens: inputs.avgInputTokens, avgOutputTokens: inputs.avgOutputTokens }} labels={{ monthlyQueries: 'Monthly Queries', avgInputTokens: 'Avg Input Tokens', avgOutputTokens: 'Avg Output Tokens' }} calculateFn={calcCost} resultLabel="monthly cost (inverted)" />
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding LLM API Pricing</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>Large language model APIs have become the backbone of modern AI applications, from chatbots and content generation to code assistants and data analysis. But pricing varies dramatically across providers and models. A single API call can cost anywhere from $0.00001 to $0.10+ depending on the model, token count, and whether you are processing input or generating output. Understanding these costs is essential for budgeting, choosing the right model, and building profitable AI-powered products.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How LLM Token Pricing Works</h3>
          <p>LLM providers charge based on tokens &mdash; sub-word units that represent text. For English, one token is roughly 0.75 words or about 4 characters. Pricing is split into input tokens (your prompt, system instructions, and context) and output tokens (the model&apos;s generated response). Output tokens are always more expensive because they require sequential computation &mdash; each new token depends on all previous tokens. For most models, output pricing is 3-5x the input price, which means controlling response length is one of the most powerful cost levers.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Comparing Model Tiers</h3>
          <p>The market has settled into clear tiers. Flagship models like GPT-4o, Claude Sonnet 4, and Gemini 2.5 Pro offer the best quality for complex tasks at moderate pricing. Budget models like GPT-4.1-mini, Gemini 2.5 Flash, and DeepSeek V3 deliver 80-90% of flagship quality at 5-20x lower cost. For teams building AI-powered marketing tools, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides marketing data APIs that pair well with LLM applications for competitive intelligence</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Strategies to Reduce LLM Costs</h3>
          <p>The most impactful cost reduction strategies target the largest line items: prompt engineering (shorter, more efficient prompts), model routing (using cheap models for simple tasks), response caching (avoiding duplicate generations), and output length limits (setting max_tokens). At scale, batch APIs can provide 50% discounts for non-time-sensitive workloads. To track how your AI costs translate into marketing ROI, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s analytics to measure the business impact of your AI-powered workflows</a>.</p>
        </div>
      </div>
      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="llm-pricing-calculator" />
      <PreRelatedCTA toolSlug="llm-pricing-calculator" />
      <RelatedTools currentSlug="llm-pricing-calculator" />
    </div>
  );
}
