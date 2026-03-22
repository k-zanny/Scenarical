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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const defaults = {
  estimatedWords: 500,
  tokensPerWord: 1.3,
  outputMultiplier: 0.5,
  queriesPerDay: 50,
  modelInputCost: 3.00,
  modelOutputCost: 15.00,
};
type Inputs = typeof defaults;
interface Scenario { id: string; label: string; inputs: Inputs; }

const faqs = [
  { question: 'How many tokens is a word?', answer: 'For English text, one word is approximately 1.3 tokens on average. However, this varies by content type: simple conversational text averages about 1.2 tokens per word, while technical or code-heavy content averages 1.5-2.0 tokens per word due to specialized vocabulary and syntax characters. Non-English languages can use significantly more tokens per word \u2014 Chinese, Japanese, and Korean typically use 2-3 tokens per character.' },
  { question: 'What is the difference between input and output tokens?', answer: 'Input tokens are everything you send to the model: your system prompt, user message, any context or examples, and conversation history. Output tokens are what the model generates in response. Output tokens cost more (typically 3-5x) because generating each token requires sequential computation. A common optimization is to keep input detailed (for quality) while constraining output length (for cost) using the max_tokens parameter.' },
  { question: 'How do I estimate token counts for my use case?', answer: 'Start with your average prompt word count and multiply by 1.3 for a rough token estimate. For more accuracy, consider: system prompts (often 200-500 tokens), few-shot examples (100-300 tokens each), user input (varies), and any context/RAG chunks (typically 200-500 tokens per chunk). For output, estimate the typical response length you need. Use this calculator to model different scenarios and see how token counts translate to costs at scale.' },
  { question: 'Why does the tokens-per-word ratio matter for cost estimation?', answer: 'The tokens-per-word ratio directly impacts your cost accuracy. Using 1.0 (one token per word) underestimates costs by 23-30% for English text. Code and technical content can use 1.5-2.0 tokens per word. If you are building cost projections for a budget, always use 1.3-1.5 to account for the typical overhead. Underestimating token counts is the most common reason AI project costs exceed initial estimates.' },
];

function computeMetrics(inp: Inputs) {
  const estimatedInputTokens = Math.round(inp.estimatedWords * inp.tokensPerWord);
  const estimatedOutputTokens = Math.round(estimatedInputTokens * inp.outputMultiplier);
  const totalTokensPerQuery = estimatedInputTokens + estimatedOutputTokens;
  const dailyInputTokens = estimatedInputTokens * inp.queriesPerDay;
  const dailyOutputTokens = estimatedOutputTokens * inp.queriesPerDay;
  const dailyCost = (dailyInputTokens / 1000000) * inp.modelInputCost + (dailyOutputTokens / 1000000) * inp.modelOutputCost;
  const monthlyCost = dailyCost * 30;
  const costPerQuery = inp.queriesPerDay > 0 ? dailyCost / inp.queriesPerDay : 0;
  const annualCost = monthlyCost * 12;
  return { estimatedInputTokens, estimatedOutputTokens, totalTokensPerQuery, dailyInputTokens, dailyOutputTokens, dailyCost, monthlyCost, costPerQuery, annualCost };
}

export default function TokenCounterClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputText, setInputText] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([{ id: 'A', label: 'Scenario A', inputs: { ...defaults } }]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalBudget, setGoalBudget] = useState(100);
  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('token-counter');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);
  useEffect(() => { saveToLocalStorage('token-counter', inputs); }, [inputs]);

  const update = (key: keyof Inputs, value: number) => setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s));
  const resetDefaults = () => { setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...defaults } } : s)); setInputText(''); };
  const addScenario = () => { if (scenarios.length >= 3) return; const nid = String.fromCharCode(65 + scenarios.length); setScenarios(prev => [...prev, { id: nid, label: `Scenario ${nid}`, inputs: { ...inputs } }]); setActiveScenario(nid); };
  const removeScenario = (id: string) => { if (id === 'A') return; setScenarios(prev => prev.filter(s => s.id !== id)); setActiveScenario('A'); };

  const textWordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const textTokenEstimate = Math.round(textWordCount * inputs.tokensPerWord);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (textWordCount > 0) update('estimatedWords', textWordCount); }, [textWordCount]);

  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  const calcCost = useCallback((inp: Record<string, number>) => {
    const inT = (inp.estimatedWords || 0) * (inp.tokensPerWord || 0);
    const outT = inT * (inp.outputMultiplier || 0);
    const dailyIn = inT * (inp.queriesPerDay || 0);
    const dailyOut = outT * (inp.queriesPerDay || 0);
    return -((dailyIn / 1000000) * (inp.modelInputCost || 0) + (dailyOut / 1000000) * (inp.modelOutputCost || 0)) * 30;
  }, []);

  const reverseScenarios = isReverse ? (() => {
    const results: Array<{label: string; description: string; change: number}> = [];
    const dailyBudget = goalBudget / 30;
    const neededQueries = m.costPerQuery > 0 ? Math.floor(dailyBudget / m.costPerQuery) : 0;
    results.push({ label: 'Reduce Query Volume', description: `Limit to ${formatNumber(neededQueries)} queries/day`, change: inputs.queriesPerDay > 0 ? ((neededQueries - inputs.queriesPerDay) / inputs.queriesPerDay) * 100 : 0 });
    const costPerToken = m.totalTokensPerQuery > 0 ? m.costPerQuery / m.totalTokensPerQuery : 0;
    const targetTokensPerQuery = costPerToken > 0 && inputs.queriesPerDay > 0 ? (dailyBudget / inputs.queriesPerDay) / costPerToken : 0;
    const targetWords = inputs.tokensPerWord > 0 ? Math.floor(targetTokensPerQuery / (inputs.tokensPerWord * (1 + inputs.outputMultiplier))) : 0;
    results.push({ label: 'Shorten Prompts', description: `Reduce to ~${formatNumber(Math.max(0, targetWords))} words per prompt`, change: inputs.estimatedWords > 0 ? ((targetWords - inputs.estimatedWords) / inputs.estimatedWords) * 100 : 0 });
    const costRatio = m.monthlyCost > 0 ? goalBudget / m.monthlyCost : 1;
    results.push({ label: 'Use Cheaper Model', description: `Target $${(inputs.modelInputCost * costRatio).toFixed(2)} per 1M input tokens`, change: costRatio < 1 ? (costRatio - 1) * 100 : 0 });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const chartData = {
    labels: ['Input Tokens/Query', 'Output Tokens/Query', 'Daily Cost ($)', 'Monthly Cost ($)'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.estimatedInputTokens, s.metrics.estimatedOutputTokens, s.metrics.dailyCost, s.metrics.monthlyCost],
      backgroundColor: [`${scenarioColors[idx]}B3`, `${scenarioColors[idx]}99`, `${scenarioColors[idx]}80`, `${scenarioColors[idx]}B3`],
      borderColor: scenarioColors[idx], borderWidth: 1, borderRadius: 6,
    })),
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: scenarios.length > 1, labels: { color: '#94A3B8', font: { family: 'var(--font-dm-sans)', size: 11 } } },
      tooltip: { backgroundColor: '#141926', borderColor: '#283044', borderWidth: 1, titleColor: '#E8ECF4', bodyColor: '#94A3B8',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callbacks: { label: (ctx: any) => { const v = ctx.raw as number; const l = ctx.label as string; return l.includes('$') ? `${ctx.dataset.label}: ${formatCurrency(v)}` : `${ctx.dataset.label}: ${formatNumber(Math.round(v))}`; } } } },
    scales: {
      x: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', font: { size: 10 } } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', callback: (v: any) => Number(v).toLocaleString() } },
    },
  };

  const benchmarkTokens = (benchmarks.ai_llm.avg_tokens_per_query || 1500) + (benchmarks.ai_llm.avg_tokens_per_response || 500);

  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.monthlyCost > 5000) return { status: 'danger', title: `Projected monthly cost of ${formatCurrency(m.monthlyCost)} is very high \u2014 token optimization is critical.`, actions: [
      { icon: '\u{2702}\u{FE0F}', text: 'Trim your prompts \u2014 remove redundant instructions, reduce few-shot examples, and compress context. Most prompts can be shortened 30-50%.', affiliateText: 'Plan efficient AI content with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F4C9}', text: 'Set max_tokens on every API call. Unbounded output is the most common cause of cost overruns.' },
      { icon: '\u{1F500}', text: 'Route simple queries to budget models. Many queries do not need flagship model capabilities.' },
    ] };
    if (m.monthlyCost > 1000) return { status: 'warning', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is significant \u2014 there is optimization potential.`, actions: [
      { icon: '\u{1F4CA}', text: 'Profile your token usage \u2014 identify which queries use the most tokens and optimize those first for maximum impact.' },
      { icon: '\u{1F3AF}', text: 'Reduce output multiplier by constraining response length. Ask the model for concise responses or structured JSON output.', affiliateText: 'Optimize content strategy with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F4BE}', text: 'Implement prompt caching for system prompts that repeat across queries. Many providers offer cached prompt discounts.' },
    ] };
    if (m.monthlyCost > 100) return { status: 'good', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is manageable \u2014 good token efficiency.`, actions: [
      { icon: '\u{1F4C8}', text: 'Monitor your cost per query trend as you scale. Small per-query increases compound quickly at higher volumes.' },
      { icon: '\u{1F9EA}', text: 'A/B test different prompt lengths and models to find the optimal quality-to-cost ratio for your specific use case.', affiliateText: 'Research AI content topics with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F527}', text: 'Consider structured output formats (JSON, XML) to reduce token waste from natural language boilerplate in responses.' },
    ] };
    return { status: 'excellent', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is very efficient \u2014 excellent token management.`, actions: [
      { icon: '\u{1F680}', text: 'At this cost level, consider using more capable models or adding more context to improve output quality.', affiliateText: 'Maximize AI content ROI with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F4E6}', text: 'Explore adding RAG (retrieval augmented generation) to enrich prompts with relevant context at minimal cost.' },
      { icon: '\u{1F310}', text: 'Scale your query volume \u2014 your per-query cost is low enough to support significant growth.' },
    ] };
  };
  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Token Counter &amp; Estimator</h1>
        <p className="text-label max-w-2xl">Estimate token counts from word counts, project input and output token costs across models, and calculate daily and monthly LLM API spending. Paste text for instant estimation or use sliders to model different usage scenarios.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map((s) => (<button key={s.id} onClick={() => setActiveScenario(s.id)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeScenario === s.id ? 'bg-accent text-white' : 'text-label hover:text-foreground'}`}>{s.label}{s.id !== 'A' && <span onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} className="ml-1.5 text-white/60 hover:text-white">{'\u00D7'}</span>}</button>))}
            {scenarios.length < 3 && <button onClick={addScenario} className="text-sm text-accent hover:text-accent-hover px-3 py-1.5 border border-accent/30 rounded-lg transition-colors">+ Add Scenario {String.fromCharCode(65 + scenarios.length)}</button>}
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>
          <div className="mb-5">
            <label className="text-sm font-medium text-label block mb-2">Paste Text to Estimate Tokens <span className="text-muted font-normal">(optional)</span></label>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Paste your prompt or text here to get a word and token count..." className="w-full h-28 bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent resize-none font-mono" />
            {textWordCount > 0 && (<div className="flex gap-4 mt-2 text-xs text-label"><span>{formatNumber(textWordCount)} words</span><span>~{formatNumber(textTokenEstimate)} tokens (estimated)</span><span>{inputText.length.toLocaleString()} characters</span></div>)}
          </div>
          <ScenarioSlider label="Estimated Words per Prompt" value={inputs.estimatedWords} min={10} max={10000} step={10} onChange={(v) => { update('estimatedWords', v); setInputText(''); }} benchmarkChips={[{ label: '100', value: 100 }, { label: '500', value: 500 }, { label: '1K', value: 1000 }, { label: '5K', value: 5000 }]} />
          <ScenarioSlider label="Queries per Day" value={inputs.queriesPerDay} min={1} max={10000} step={1} onChange={(v) => update('queriesPerDay', v)} benchmarkChips={[{ label: '10', value: 10 }, { label: '50', value: 50 }, { label: '100', value: 100 }, { label: '500', value: 500 }]} />
          <ScenarioSlider label="Model Input Cost (per 1M tokens)" value={inputs.modelInputCost} min={0.05} max={20} step={0.05} prefix="$" onChange={(v) => update('modelInputCost', v)} benchmarkChips={[{ label: 'Budget $0.15', value: 0.15 }, { label: 'Mid $3', value: 3.00 }, { label: 'Premium $15', value: 15.00 }]} />
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>
          {showAdvanced && (<div className="border-t border-surface-lighter pt-4 space-y-0">
            <ScenarioSlider label="Tokens per Word Ratio" value={inputs.tokensPerWord} min={1.0} max={3.0} step={0.1} onChange={(v) => update('tokensPerWord', v)} benchmarkChips={[{ label: 'English 1.3', value: 1.3 }, { label: 'Code 1.8', value: 1.8 }, { label: 'CJK 2.5', value: 2.5 }]} />
            <ScenarioSlider label="Output / Input Ratio" value={inputs.outputMultiplier} min={0.1} max={3.0} step={0.1} onChange={(v) => update('outputMultiplier', v)} benchmarkChips={[{ label: 'Short 0.3', value: 0.3 }, { label: 'Typical 0.5', value: 0.5 }, { label: 'Long 1.0', value: 1.0 }, { label: 'Verbose 2.0', value: 2.0 }]} />
            <ScenarioSlider label="Model Output Cost (per 1M tokens)" value={inputs.modelOutputCost} min={0.10} max={80} step={0.10} prefix="$" onChange={(v) => update('modelOutputCost', v)} />
          </div>)}
        </div>
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Tokens per Query" value={formatNumber(m.totalTokensPerQuery)} subtitle={`${formatNumber(m.estimatedInputTokens)} in + ${formatNumber(m.estimatedOutputTokens)} out`} color="blue" />
              <KPICard title="Daily Cost" value={formatCurrency(m.dailyCost)} subtitle={`${formatNumber(inputs.queriesPerDay)} queries/day`} color={m.dailyCost < 10 ? 'green' : m.dailyCost < 100 ? 'amber' : 'red'} clickable onGoalSubmit={() => setIsReverse(!isReverse)} />
              <KPICard title="Monthly Cost" value={formatCurrency(m.monthlyCost)} subtitle={m.costPerQuery < 0.01 ? `$${m.costPerQuery.toFixed(4)}/query` : `${formatCurrency(m.costPerQuery)}/query`} color={m.monthlyCost < 100 ? 'green' : m.monthlyCost < 1000 ? 'amber' : 'red'} />
            </div>
          ) : (<div className="space-y-3 mb-6">{allMetrics.map((s, idx) => (<div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3"><p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><p className="text-[10px] text-muted uppercase">Tokens/Query</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatNumber(s.metrics.totalTokensPerQuery)}</p></div><div><p className="text-[10px] text-muted uppercase">Daily Cost</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.dailyCost)}</p></div><div><p className="text-[10px] text-muted uppercase">Monthly Cost</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.monthlyCost)}</p></div></div></div>))}</div>)}
          <PostKPICTA toolSlug="token-counter" />
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6"><h3 className="text-sm font-medium text-label mb-3">Token &amp; Cost Breakdown</h3><div className="h-80 sm:h-96"><Bar data={chartData} options={chartOptions} /></div></div>
          <BenchmarkGauge label="Tokens per Query vs. Industry Average" value={m.totalTokensPerQuery} benchmark={benchmarkTokens} min={0} max={benchmarkTokens * 3} suffix=" tokens" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Optimize your AI content costs" />
          <div className="flex gap-3 mt-4"><ShareButton slug="token-counter" inputs={inputs} /></div>
        </div>
      </div>
      {isReverse && (<div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Budget Target &mdash; How to stay within your monthly budget</h3>
        <div className="mb-4"><label className="text-sm text-label">Target Monthly Budget</label><div className="flex items-center gap-2 mt-1"><span className="text-label">$</span><input type="number" value={goalBudget} onChange={(e) => setGoalBudget(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{reverseScenarios.map((sc, i) => (<div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>{i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Smallest change needed</span>}<h4 className="text-sm font-semibold text-foreground mt-1">{sc.label}</h4><p className="text-xs text-label mt-1">{sc.description}</p><p className="text-xs font-mono mt-2 text-label">Change: <span className={sc.change > 0 ? 'text-danger' : 'text-success'}>{sc.change > 0 ? '+' : ''}{sc.change.toFixed(1)}%</span></p></div>))}</div>
        <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
      </div>)}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />
      <RiskRadar inputs={inputs} labels={{ estimatedWords: 'Words/Prompt', tokensPerWord: 'Tokens/Word', outputMultiplier: 'Output Ratio', queriesPerDay: 'Queries/Day', modelInputCost: 'Input $/1M', modelOutputCost: 'Output $/1M' }} calculateFn={calcCost} resultLabel="monthly cost (inverted)" />
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding LLM Tokens and Costs</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>Tokens are the fundamental unit of LLM pricing. Every API call consumes tokens &mdash; both for the input you send and the output the model generates. Understanding how words translate to tokens, and how tokens translate to costs, is essential for budgeting any AI application. This calculator helps you model the full pipeline: from words to tokens to daily and monthly costs, across different models and usage patterns.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Words to Tokens: The Conversion Factor</h3>
          <p>For standard English text, one word averages approximately 1.3 tokens. This ratio varies by content type: conversational text averages 1.2, technical documentation 1.4, source code 1.5-2.0, and non-Latin scripts (Chinese, Japanese, Korean) can use 2-3 tokens per word or character. The tokenizer splits words into sub-word units &mdash; common words like &quot;the&quot; are single tokens, while rare or compound words get split into multiple tokens. Understanding your specific tokens-per-word ratio is key to accurate cost projections.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Input vs Output Token Economics</h3>
          <p>LLM APIs charge separately for input tokens (your prompt) and output tokens (the model&apos;s response). Output tokens typically cost 3-5x more than input tokens because generating each output token requires sequential computation &mdash; each new token depends on all previous ones. This pricing structure means that response length is one of the most powerful cost levers. A prompt that generates a 500-token response costs significantly less than one generating a 2000-token response, even with the same input. To plan your AI content strategy efficiently, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush helps you identify high-value content topics to focus your AI resources on the highest-impact use cases</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Practical Cost Optimization</h3>
          <p>The most effective cost optimizations target the largest line items. First, audit your prompts &mdash; most can be shortened 30-50% by removing redundant instructions and compressing context. Second, set max_tokens on every API call to prevent unnecessarily long responses. Third, implement prompt caching for system prompts that repeat across queries &mdash; many providers offer significant discounts for cached input tokens. Fourth, use structured output formats (JSON, XML) to reduce boilerplate in responses. Finally, route simple queries to budget models &mdash; not every query needs a flagship model. For data-driven content planning that maximizes token efficiency, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s keyword and content tools to focus AI spend on the topics that drive the most value</a>.</p>
        </div>
      </div>
      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="token-counter" />
      <PreRelatedCTA toolSlug="token-counter" />
      <RelatedTools currentSlug="token-counter" />
    </div>
  );
}
