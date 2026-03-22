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
import llmPricing from '@/data/llm-pricing.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyQueries: 5000,
  avgInputTokens: 2000,
  avgOutputTokens: 1000,
  contextNeeded: 32000,
};

type Inputs = typeof defaults;

interface Scenario { id: string; label: string; inputs: Inputs; }

interface ModelResult {
  name: string;
  provider: string;
  monthlyCost: number;
  costPerQuery: number;
  meetsContextRequirement: boolean;
  contextWindow: number;
  category: string;
}

/* ================================================================== */
/*  FAQs                                                               */
/* ================================================================== */
const faqs = [
  {
    question: 'Which LLM is cheapest for high-volume applications?',
    answer: 'For high-volume use cases, budget-tier models like GPT-4.1-nano, Gemini 2.0 Flash, and GPT-4o-mini offer the lowest per-token costs. At 50,000+ queries per month, these models can cost 10-50x less than flagship models while still delivering strong performance on straightforward tasks like classification, extraction, and simple Q&A.',
  },
  {
    question: 'How do context window sizes affect my choice of LLM?',
    answer: 'Context window determines how much text you can send in a single request. If you need to process long documents, you need models with 128K+ context windows. Google Gemini and GPT-4.1 models offer 1M+ token windows, while Claude and OpenAI o-series models offer 200K. Choose based on your longest typical input, not just cost.',
  },
  {
    question: 'Is a more expensive model always better?',
    answer: 'No. Flagship models like Claude Opus and GPT-4o excel at complex reasoning and nuanced writing, but budget models handle routine tasks nearly as well at a fraction of the cost. The best strategy is to route simple queries to cheap models and reserve expensive models for tasks that truly require their capabilities.',
  },
  {
    question: 'How do I estimate my monthly token usage?',
    answer: 'Track your average input and output token counts across a sample of real queries. Most API providers include token counts in their responses. As a rough guide: 1,000 tokens is approximately 750 words of English text. A typical chatbot query uses 500-2,000 input tokens, while document analysis might use 10,000-50,000 input tokens per request.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const models: ModelResult[] = Object.entries(llmPricing.models).map(([name, model]) => {
    const monthlyCost =
      (inp.monthlyQueries * inp.avgInputTokens / 1e6) * model.input_per_1m +
      (inp.monthlyQueries * inp.avgOutputTokens / 1e6) * model.output_per_1m;
    const costPerQuery = inp.monthlyQueries > 0 ? monthlyCost / inp.monthlyQueries : 0;
    const meetsContextRequirement = model.context_window >= inp.contextNeeded;
    return { name, provider: model.provider, monthlyCost, costPerQuery, meetsContextRequirement, contextWindow: model.context_window, category: model.category };
  });

  const sortedByCost = [...models].sort((a, b) => a.monthlyCost - b.monthlyCost);
  const cheapestOverall = sortedByCost[0];
  const qualifyingModels = sortedByCost.filter(m => m.meetsContextRequirement);
  const bestValue = qualifyingModels.length > 0 ? qualifyingModels[0] : null;
  const allCosts = models.map(m => m.monthlyCost).sort((a, b) => a - b);
  const medianCost = allCosts[Math.floor(allCosts.length / 2)];
  const yourCost = bestValue ? bestValue.monthlyCost : cheapestOverall.monthlyCost;

  return { models, cheapestOverall, bestValue, medianCost, yourCost, sortedByCost };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function LLMComparisonClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalCost, setGoalCost] = useState(100);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('llm-comparison');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('llm-comparison', inputs); }, [inputs]);

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

  const calcCost = useCallback((inp: Record<string, number>) => {
    const cost = (((inp.monthlyQueries || 0) * (inp.avgInputTokens || 0)) / 1e6) * 1.0 +
      (((inp.monthlyQueries || 0) * (inp.avgOutputTokens || 0)) / 1e6) * 4.0;
    return -cost;
  }, []);

  // Reverse goal mode
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    if (m.bestValue) {
      const cpq = m.bestValue.costPerQuery;
      const affordableQueries = cpq > 0 ? Math.floor(goalCost / cpq) : 0;
      results.push({ label: `Use ${m.bestValue.name}`, description: `${formatNumber(affordableQueries)} queries/mo at ${formatCurrency(goalCost)}/mo`, change: inputs.monthlyQueries > 0 ? ((affordableQueries - inputs.monthlyQueries) / inputs.monthlyQueries) * 100 : 0 });
    }
    if (m.cheapestOverall) {
      const cpq = m.cheapestOverall.costPerQuery;
      const affordableQueries = cpq > 0 ? Math.floor(goalCost / cpq) : 0;
      results.push({ label: `Use ${m.cheapestOverall.name}`, description: `${formatNumber(affordableQueries)} queries/mo at ${formatCurrency(goalCost)}/mo`, change: inputs.monthlyQueries > 0 ? ((affordableQueries - inputs.monthlyQueries) / inputs.monthlyQueries) * 100 : 0 });
    }
    if (m.bestValue) {
      const currentCost = m.bestValue.monthlyCost;
      const reductionNeeded = currentCost > 0 ? ((currentCost - goalCost) / currentCost) * 100 : 0;
      results.push({ label: 'Reduce Token Usage', description: `Cut input/output tokens by ${reductionNeeded.toFixed(0)}%`, change: -reductionNeeded });
    }
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart setup
  const providerColors: Record<string, string> = { 'OpenAI': '#3B82F6', 'Anthropic': '#F97316', 'Google': '#22C55E', 'DeepSeek': '#A855F7', 'Meta (via providers)': '#6B7280', 'Mistral': '#6B7280' };
  const top8 = m.sortedByCost.slice(0, 8);
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: top8.map(model => model.name),
    datasets: [{
      label: 'Monthly Cost',
      data: top8.map(model => model.monthlyCost),
      backgroundColor: top8.map(model => model.meetsContextRequirement ? (providerColors[model.provider] || '#6B7280') + 'B3' : (providerColors[model.provider] || '#6B7280') + '40'),
      borderColor: top8.map(model => providerColors[model.provider] || '#6B7280'),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141926', borderColor: '#283044', borderWidth: 1, titleColor: '#E8ECF4', bodyColor: '#94A3B8',
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => { const model = top8[ctx.dataIndex]; return `${formatCurrency(ctx.raw as number)}/mo \u2014 ${model.meetsContextRequirement ? 'Meets context' : 'Below context need'}`; },
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', callback: (v: string | number) => '$' + Number(v).toLocaleString() } },
      y: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.yourCost > 500) {
      return { status: 'danger', title: `Your estimated cost of ${formatCurrency(m.yourCost)}/mo is high. Consider optimizing model selection or token usage.`, actions: [
        { icon: '\uD83D\uDCA1', text: 'Switch to a budget-tier model for simple tasks. GPT-4.1-nano and Gemini 2.0 Flash cost 10-50x less than flagship models.', affiliateText: 'Optimize your AI stack with Semrush data', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\u2702\uFE0F', text: 'Reduce input tokens by summarizing or chunking documents before sending to the LLM.' },
        { icon: '\uD83D\uDD00', text: 'Implement model routing. Use cheap models for easy queries and expensive models only when needed.' },
      ] };
    }
    if (m.yourCost > 200) {
      return { status: 'warning', title: `${formatCurrency(m.yourCost)}/mo is moderate. There may be room to optimize with smarter model routing.`, actions: [
        { icon: '\uD83D\uDCCA', text: 'Benchmark your actual query complexity. Many queries can be handled by smaller models.' },
        { icon: '\uD83E\uDDEA', text: 'A/B test model quality on a sample of queries to find the cheapest model that meets your quality bar.', affiliateText: 'Research AI tools with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDCBE', text: 'Cache frequent responses. Even a 20% cache hit rate can significantly reduce monthly costs.' },
      ] };
    }
    if (m.yourCost > 50) {
      return { status: 'good', title: `${formatCurrency(m.yourCost)}/mo is reasonable. You are below the median model cost.`, actions: [
        { icon: '\uD83D\uDCC8', text: 'You have room to scale query volume without major cost concerns at this price point.' },
        { icon: '\uD83D\uDD0D', text: 'Consider whether a slightly more capable model could improve output quality without breaking the budget.', affiliateText: 'Explore AI marketing tools', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDD04', text: 'Set up cost monitoring and alerts to catch unexpected usage spikes early.' },
      ] };
    }
    return { status: 'excellent', title: `${formatCurrency(m.yourCost)}/mo is well below the median. You are using a cost-efficient model.`, actions: [
      { icon: '\uD83D\uDE80', text: 'At this cost level, you can aggressively scale query volume or add new AI-powered features.', affiliateText: 'Scale your AI marketing with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\uD83E\uDDE0', text: 'Consider using saved budget to experiment with flagship models on high-value use cases.' },
      { icon: '\uD83D\uDCE6', text: 'Batch process non-urgent requests during off-peak hours for potential additional savings.' },
    ] };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Claude vs ChatGPT vs Gemini Comparison Calculator</h1>
        <p className="text-label max-w-2xl">
          Compare LLM API costs across all major providers. Adjust your query volume, token
          usage, and context window requirements to find the most cost-effective model for
          your use case &mdash; with real-time cost breakdowns and visual comparisons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============ INPUT PANEL ============ */}
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

          <ScenarioSlider label="Monthly Queries" value={inputs.monthlyQueries} min={100} max={500000} step={100} onChange={(v) => update('monthlyQueries', v)} benchmarkChips={[{ label: '1K', value: 1000 }, { label: '5K', value: 5000 }, { label: '50K', value: 50000 }, { label: '200K', value: 200000 }]} />
          <ScenarioSlider label="Avg Input Tokens / Query" value={inputs.avgInputTokens} min={100} max={50000} step={100} onChange={(v) => update('avgInputTokens', v)} benchmarkChips={[{ label: '500', value: 500 }, { label: '2K', value: 2000 }, { label: '10K', value: 10000 }, { label: '32K', value: 32000 }]} />
          <ScenarioSlider label="Avg Output Tokens / Query" value={inputs.avgOutputTokens} min={50} max={16000} step={50} onChange={(v) => update('avgOutputTokens', v)} benchmarkChips={[{ label: '250', value: 250 }, { label: '1K', value: 1000 }, { label: '4K', value: 4000 }]} />

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider label="Min Context Window (tokens)" value={inputs.contextNeeded} min={4000} max={1048576} step={1000} onChange={(v) => update('contextNeeded', v)} benchmarkChips={[{ label: '32K', value: 32000 }, { label: '128K', value: 128000 }, { label: '200K', value: 200000 }, { label: '1M', value: 1048576 }]} />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Cheapest Model" value={m.cheapestOverall.name} subtitle={`${formatCurrency(m.cheapestOverall.monthlyCost)}/mo`} color="green" />
              <KPICard title="Best Value" value={m.bestValue ? m.bestValue.name : 'None qualify'} subtitle={m.bestValue ? `${formatCurrency(m.bestValue.monthlyCost)}/mo (meets context)` : 'Increase context tolerance'} color={m.bestValue ? 'blue' : 'red'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Your Monthly Cost" value={formatCurrency(m.yourCost)} subtitle={`${formatCurrency(m.yourCost / Math.max(inputs.monthlyQueries, 1), 4)}/query`} color={m.yourCost < m.medianCost ? 'green' : 'amber'} />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><p className="text-[10px] text-muted uppercase">Cheapest</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{s.metrics.cheapestOverall.name}</p></div>
                    <div><p className="text-[10px] text-muted uppercase">Best Value</p><p className="font-mono text-lg font-bold text-foreground">{s.metrics.bestValue ? s.metrics.bestValue.name : 'N/A'}</p></div>
                    <div><p className="text-[10px] text-muted uppercase">Your Cost</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.yourCost)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="llm-comparison" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-1">Monthly Cost by Model (Top 8 Cheapest)</h3>
            <p className="text-xs text-muted mb-3">Faded bars = model does not meet your context window requirement</p>
            <div className="h-80 sm:h-96"><Bar data={chartData} options={chartOptions} /></div>
          </div>

          <BenchmarkGauge label="Your Monthly Cost vs. Median Model Cost" value={m.yourCost} benchmark={m.medianCost} min={0} max={m.medianCost * 3} prefix="$" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Optimize your AI spend" />

          <div className="flex gap-3 mt-4"><ShareButton slug="llm-comparison" inputs={inputs} /></div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Target &mdash; How to stay within your monthly cost goal</h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Budget</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input type="number" value={goalCost} onChange={(e) => setGoalCost(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Easiest path</span>}
                <h4 className="text-sm font-semibold text-foreground mt-1">{scenario.label}</h4>
                <p className="text-xs text-label mt-1">{scenario.description}</p>
                <p className="text-xs font-mono mt-2 text-label">Change: <span className={scenario.change > 0 ? 'text-success' : 'text-danger'}>{scenario.change > 0 ? '+' : ''}{scenario.change.toFixed(1)}%</span></p>
              </div>
            ))}
          </div>
          <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar inputs={inputs} labels={{ monthlyQueries: 'Monthly Queries', avgInputTokens: 'Input Tokens', avgOutputTokens: 'Output Tokens', contextNeeded: 'Context Window' }} calculateFn={calcCost} resultLabel="monthly cost (inverted)" />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Comparing LLM API Costs: Claude, ChatGPT, and Gemini</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>The large language model landscape has exploded with options, and choosing the right model is no longer just about capability &mdash; it is fundamentally about economics. With API pricing varying by 100x or more between the cheapest and most expensive models, the difference between a well-chosen model and a poorly chosen one can mean thousands of dollars per month at production scale. This calculator helps you make that decision with real numbers.</p>
          <p>Each provider &mdash; OpenAI (GPT-4o, GPT-4.1, o3), Anthropic (Claude Opus, Sonnet, Haiku), Google (Gemini 2.5 Pro, Flash), DeepSeek, Meta, and Mistral &mdash; prices differently for input versus output tokens. Output tokens are typically 2-5x more expensive than input tokens because they require more computation. This means your cost profile depends heavily on whether your use case is input-heavy (document analysis, summarization) or output-heavy (content generation, code writing).</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Understanding Context Windows and Their Cost Impact</h3>
          <p>Context window size determines the maximum amount of text a model can process in a single request. Google Gemini and OpenAI GPT-4.1 models lead with 1M+ token windows, while Anthropic Claude models offer 200K tokens. For applications that process long documents, legal contracts, or entire codebases, a large context window is essential &mdash; but you only pay for the tokens you actually use, not the full window size. To understand how different AI models can enhance your marketing workflow, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush integrates AI across 55+ marketing tools to automate analysis and reporting</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Cost Optimization Strategies for LLM APIs</h3>
          <p>The most effective cost optimization strategy is model routing: using cheap models for simple queries and reserving expensive models for complex tasks. A classification layer can route 70-80% of typical queries to budget models like GPT-4.1-nano or Gemini Flash, reducing total costs by 5-10x without meaningful quality loss. Response caching is another high-impact technique &mdash; if even 20% of your queries are repeated or similar, caching can cut costs proportionally.</p>
          <p>Token optimization matters too. Prompt engineering to reduce unnecessary instructions, using structured outputs to minimize response tokens, and preprocessing inputs to remove irrelevant content can each reduce costs by 20-40%. At scale, these optimizations compound. For teams building AI-powered marketing and content tools, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides competitive intelligence APIs that can feed your AI applications with structured marketing data</a>.</p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="llm-comparison" />
      <PreRelatedCTA toolSlug="llm-comparison" />
      <RelatedTools currentSlug="llm-comparison" />
    </div>
  );
}
