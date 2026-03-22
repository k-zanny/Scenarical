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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const defaults = {
  agentCallsPerDay: 100,
  avgStepsPerCall: 5,
  avgInputTokensPerStep: 2000,
  avgOutputTokensPerStep: 800,
  modelInputCostPer1M: 3.00,
  modelOutputCostPer1M: 15.00,
  toolCallsPerStep: 1,
  toolCallCostEach: 0.01,
};
type Inputs = typeof defaults;
interface Scenario { id: string; label: string; inputs: Inputs; }

const faqs = [
  { question: 'What is an AI agent and how does it differ from a simple API call?', answer: 'An AI agent is an autonomous system that uses an LLM to plan and execute multi-step tasks. Unlike a single API call where you send a prompt and get a response, an agent makes multiple sequential LLM calls \u2014 each step may involve reasoning about what to do next, calling external tools (search, databases, APIs), and incorporating the results. This multi-step nature means agent costs are multiplicative: cost = steps per call x (LLM cost per step + tool cost per step) x number of calls.' },
  { question: 'How many steps does a typical AI agent take per task?', answer: 'Simple agents (question answering with retrieval) typically take 2-3 steps. Moderate complexity agents (research, data analysis) average 4-8 steps. Complex agents (multi-tool orchestration, code generation with testing) can take 10-20+ steps. The number of steps is the primary cost driver \u2014 an agent that takes 10 steps costs 10x more per task than a single API call with the same model.' },
  { question: 'What are tool call costs in AI agents?', answer: 'Tool calls are external actions the agent performs \u2014 web searches, database queries, API calls, code execution. Each tool call has its own cost (search APIs typically charge $0.005-$0.02 per query, database lookups are often fractions of a cent). While individually cheap, they add up quickly when an agent makes 1-3 tool calls per step across 5-10 steps per task.' },
  { question: 'How can I reduce AI agent infrastructure costs?', answer: 'Key strategies: (1) Limit max steps per agent call to prevent runaway costs, (2) Use cheaper models for planning steps and expensive models only for final output, (3) Cache tool call results to avoid redundant external calls, (4) Optimize prompts to reduce token usage per step, (5) Implement early stopping when the agent has found a satisfactory answer, and (6) Use async batch processing for non-urgent agent tasks.' },
];

function computeMetrics(inp: Inputs) {
  const totalStepsPerDay = inp.agentCallsPerDay * inp.avgStepsPerCall;
  const dailyInputTokens = totalStepsPerDay * inp.avgInputTokensPerStep;
  const dailyOutputTokens = totalStepsPerDay * inp.avgOutputTokensPerStep;
  const dailyInputCost = (dailyInputTokens / 1000000) * inp.modelInputCostPer1M;
  const dailyOutputCost = (dailyOutputTokens / 1000000) * inp.modelOutputCostPer1M;
  const dailyLLMCost = dailyInputCost + dailyOutputCost;
  const dailyToolCost = totalStepsPerDay * inp.toolCallsPerStep * inp.toolCallCostEach;
  const dailyTotalCost = dailyLLMCost + dailyToolCost;
  const monthlyCost = dailyTotalCost * 30;
  const annualCost = monthlyCost * 12;
  const costPerAgentCall = inp.agentCallsPerDay > 0 ? dailyTotalCost / inp.agentCallsPerDay : 0;
  return { totalStepsPerDay, dailyInputTokens, dailyOutputTokens, dailyInputCost, dailyOutputCost, dailyLLMCost, dailyToolCost, dailyTotalCost, monthlyCost, annualCost, costPerAgentCall };
}

export default function AIAgentCostEstimatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([{ id: 'A', label: 'Scenario A', inputs: { ...defaults } }]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalBudget, setGoalBudget] = useState(1000);
  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('ai-agent-cost-estimator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);
  useEffect(() => { saveToLocalStorage('ai-agent-cost-estimator', inputs); }, [inputs]);

  const update = (key: keyof Inputs, value: number) => setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s));
  const resetDefaults = () => setScenarios(prev => prev.map(s => s.id === activeScenario ? { ...s, inputs: { ...defaults } } : s));
  const addScenario = () => { if (scenarios.length >= 3) return; const nid = String.fromCharCode(65 + scenarios.length); setScenarios(prev => [...prev, { id: nid, label: `Scenario ${nid}`, inputs: { ...inputs } }]); setActiveScenario(nid); };
  const removeScenario = (id: string) => { if (id === 'A') return; setScenarios(prev => prev.filter(s => s.id !== id)); setActiveScenario('A'); };

  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  const calcCost = useCallback((inp: Record<string, number>) => {
    const steps = (inp.agentCallsPerDay || 0) * (inp.avgStepsPerCall || 0);
    const inT = steps * (inp.avgInputTokensPerStep || 0);
    const outT = steps * (inp.avgOutputTokensPerStep || 0);
    const llm = (inT / 1000000) * (inp.modelInputCostPer1M || 0) + (outT / 1000000) * (inp.modelOutputCostPer1M || 0);
    const tools = steps * (inp.toolCallsPerStep || 0) * (inp.toolCallCostEach || 0);
    return -(llm + tools) * 30;
  }, []);

  const reverseScenarios = isReverse ? (() => {
    const results: Array<{label: string; description: string; change: number}> = [];
    const dailyBudget = goalBudget / 30;
    const neededCalls = m.costPerAgentCall > 0 ? Math.floor(dailyBudget / m.costPerAgentCall) : 0;
    results.push({ label: 'Reduce Agent Calls', description: `Limit to ${formatNumber(neededCalls)} calls/day`, change: inputs.agentCallsPerDay > 0 ? ((neededCalls - inputs.agentCallsPerDay) / inputs.agentCallsPerDay) * 100 : 0 });
    const costPerStep = m.totalStepsPerDay > 0 ? m.dailyTotalCost / m.totalStepsPerDay : 0;
    const totalStepsBudget = costPerStep > 0 ? dailyBudget / costPerStep : 0;
    const neededSteps = inputs.agentCallsPerDay > 0 ? Math.floor(totalStepsBudget / inputs.agentCallsPerDay) : 0;
    results.push({ label: 'Fewer Steps per Call', description: `Reduce to ${neededSteps} steps per agent call`, change: inputs.avgStepsPerCall > 0 ? ((neededSteps - inputs.avgStepsPerCall) / inputs.avgStepsPerCall) * 100 : 0 });
    const costRatio = m.monthlyCost > 0 ? goalBudget / m.monthlyCost : 1;
    results.push({ label: 'Use Cheaper Model', description: `Target $${(inputs.modelInputCostPer1M * costRatio).toFixed(2)} / $${(inputs.modelOutputCostPer1M * costRatio).toFixed(2)} per 1M tokens`, change: costRatio < 1 ? (costRatio - 1) * 100 : 0 });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const chartData = {
    labels: ['LLM Input', 'LLM Output', 'Tool Calls', 'Total Daily'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.dailyInputCost, s.metrics.dailyOutputCost, s.metrics.dailyToolCost, s.metrics.dailyTotalCost],
      backgroundColor: [`${scenarioColors[idx]}B3`, `${scenarioColors[idx]}99`, `${scenarioColors[idx]}80`, `${scenarioColors[idx]}B3`],
      borderColor: scenarioColors[idx], borderWidth: 1, borderRadius: 6,
    })),
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: scenarios.length > 1, labels: { color: '#94A3B8', font: { family: 'var(--font-dm-sans)', size: 11 } } },
      tooltip: { backgroundColor: '#141926', borderColor: '#283044', borderWidth: 1, titleColor: '#E8ECF4', bodyColor: '#94A3B8',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}` } } },
    scales: {
      x: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y: { grid: { color: 'rgba(40, 48, 68, 0.5)' }, ticks: { color: '#94A3B8', callback: (v: any) => formatCurrency(Number(v)) } },
    },
  };

  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.monthlyCost > 10000) return { status: 'danger', title: `Monthly agent cost of ${formatCurrency(m.monthlyCost)} is extremely high \u2014 immediate optimization needed.`, actions: [
      { icon: '\u{1F6D1}', text: 'Set hard limits on max steps per agent call. Runaway agents without step limits are the top cause of cost overruns.', affiliateText: 'Optimize AI costs with Semrush data', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F500}', text: 'Implement model cascading \u2014 use a cheap model for initial planning and tool selection, then a capable model only for final synthesis.' },
      { icon: '\u{1F4BE}', text: 'Cache tool call results aggressively. Many agent steps query the same data repeatedly across different calls.' },
    ] };
    if (m.monthlyCost > 3000) return { status: 'warning', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is significant \u2014 optimization opportunities exist.`, actions: [
      { icon: '\u{1F4CA}', text: 'Analyze your step distribution. If most calls finish in 2-3 steps but outliers take 15+, implement early stopping.' },
      { icon: '\u{1F9E0}', text: 'Switch to a smaller model for simple agent steps while keeping the flagship model for complex reasoning.', affiliateText: 'Build smarter AI agents with Semrush APIs', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{26A1}', text: 'Batch non-urgent agent tasks and run them during off-peak hours or via batch API endpoints for 50% cost savings.' },
    ] };
    if (m.monthlyCost > 500) return { status: 'good', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is reasonable for production agent workloads.`, actions: [
      { icon: '\u{1F4C8}', text: 'Set up cost monitoring dashboards. Track cost per agent call over time to catch regressions early.' },
      { icon: '\u{1F527}', text: 'Fine-tune your agent prompts \u2014 reducing average steps from 5 to 4 saves 20% with no quality loss.', affiliateText: 'Power agents with Semrush data', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F3AF}', text: 'Evaluate tool call efficiency \u2014 ensure each tool call provides high-value information to reduce unnecessary steps.' },
    ] };
    return { status: 'excellent', title: `Monthly cost of ${formatCurrency(m.monthlyCost)} is very low \u2014 strong cost efficiency.`, actions: [
      { icon: '\u{1F680}', text: 'Consider scaling up agent capabilities. At this cost level, adding more agent features is a high-ROI investment.', affiliateText: 'Scale AI agents with Semrush intelligence', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\u{1F9EA}', text: 'Experiment with more capable models for quality improvement \u2014 the cost increase may be worth the quality gain.' },
      { icon: '\u{1F310}', text: 'Add parallel agent execution for time-sensitive tasks. Running agents concurrently reduces latency without changing per-call cost.' },
    ] };
  };
  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">AI Agent Cost Estimator</h1>
        <p className="text-label max-w-2xl">Estimate the true cost of running AI agent workflows. Model multi-step LLM calls, tool usage costs, and token consumption to project daily, monthly, and annual infrastructure spend for your AI agent deployments.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map((s) => (<button key={s.id} onClick={() => setActiveScenario(s.id)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeScenario === s.id ? 'bg-accent text-white' : 'text-label hover:text-foreground'}`}>{s.label}{s.id !== 'A' && <span onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} className="ml-1.5 text-white/60 hover:text-white">{'\u00D7'}</span>}</button>))}
            {scenarios.length < 3 && <button onClick={addScenario} className="text-sm text-accent hover:text-accent-hover px-3 py-1.5 border border-accent/30 rounded-lg transition-colors">+ Add Scenario {String.fromCharCode(65 + scenarios.length)}</button>}
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>
          <ScenarioSlider label="Agent Calls per Day" value={inputs.agentCallsPerDay} min={1} max={10000} step={1} onChange={(v) => update('agentCallsPerDay', v)} benchmarkChips={[{ label: '10', value: 10 }, { label: '50', value: 50 }, { label: '100', value: 100 }, { label: '500', value: 500 }, { label: '1K', value: 1000 }]} />
          <ScenarioSlider label="Avg Steps per Agent Call" value={inputs.avgStepsPerCall} min={1} max={30} step={1} onChange={(v) => update('avgStepsPerCall', v)} benchmarkChips={[{ label: '3 Simple', value: 3 }, { label: '5 Moderate', value: 5 }, { label: '10 Complex', value: 10 }]} />
          <ScenarioSlider label="Model Input Cost (per 1M tokens)" value={inputs.modelInputCostPer1M} min={0.05} max={20} step={0.05} prefix="$" onChange={(v) => update('modelInputCostPer1M', v)} benchmarkChips={[{ label: 'Budget $0.15', value: 0.15 }, { label: 'Mid $3', value: 3.00 }, { label: 'Premium $15', value: 15.00 }]} />
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>
          {showAdvanced && (<div className="border-t border-surface-lighter pt-4 space-y-0">
            <ScenarioSlider label="Avg Input Tokens per Step" value={inputs.avgInputTokensPerStep} min={100} max={20000} step={100} onChange={(v) => update('avgInputTokensPerStep', v)} />
            <ScenarioSlider label="Avg Output Tokens per Step" value={inputs.avgOutputTokensPerStep} min={50} max={8000} step={50} onChange={(v) => update('avgOutputTokensPerStep', v)} />
            <ScenarioSlider label="Model Output Cost (per 1M tokens)" value={inputs.modelOutputCostPer1M} min={0.10} max={80} step={0.10} prefix="$" onChange={(v) => update('modelOutputCostPer1M', v)} />
            <ScenarioSlider label="Tool Calls per Step" value={inputs.toolCallsPerStep} min={0} max={5} step={0.5} onChange={(v) => update('toolCallsPerStep', v)} />
            <ScenarioSlider label="Cost per Tool Call" value={inputs.toolCallCostEach} min={0} max={0.50} step={0.005} prefix="$" onChange={(v) => update('toolCallCostEach', v)} />
          </div>)}
        </div>
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Monthly Cost" value={formatCurrency(m.monthlyCost)} subtitle={`${formatCurrency(m.dailyTotalCost)}/day`} color={m.monthlyCost < 1000 ? 'green' : m.monthlyCost < 5000 ? 'amber' : 'red'} />
              <KPICard title="Cost per Agent Call" value={m.costPerAgentCall < 0.01 ? `$${m.costPerAgentCall.toFixed(4)}` : formatCurrency(m.costPerAgentCall, 3)} subtitle={`${formatNumber(m.totalStepsPerDay)} steps/day`} color={m.costPerAgentCall < 0.10 ? 'green' : m.costPerAgentCall < 0.50 ? 'amber' : 'red'} clickable onGoalSubmit={() => setIsReverse(!isReverse)} />
              <KPICard title="Daily Token Usage" value={formatNumber(m.dailyInputTokens + m.dailyOutputTokens)} subtitle={`${formatNumber(m.dailyInputTokens)} in + ${formatNumber(m.dailyOutputTokens)} out`} color="blue" />
            </div>
          ) : (<div className="space-y-3 mb-6">{allMetrics.map((s, idx) => (<div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3"><p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><p className="text-[10px] text-muted uppercase">Monthly Cost</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.monthlyCost)}</p></div><div><p className="text-[10px] text-muted uppercase">Cost/Call</p><p className="font-mono text-lg font-bold text-foreground">{s.metrics.costPerAgentCall < 0.01 ? `$${s.metrics.costPerAgentCall.toFixed(4)}` : formatCurrency(s.metrics.costPerAgentCall, 3)}</p></div><div><p className="text-[10px] text-muted uppercase">Daily Tokens</p><p className="font-mono text-lg font-bold text-foreground">{formatNumber(s.metrics.dailyInputTokens + s.metrics.dailyOutputTokens)}</p></div></div></div>))}</div>)}
          <PostKPICTA toolSlug="ai-agent-cost-estimator" />
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6"><h3 className="text-sm font-medium text-label mb-3">Daily Cost Breakdown</h3><div className="h-80 sm:h-96"><Bar data={chartData} options={chartOptions} /></div></div>
          <BenchmarkGauge label="Cost per Agent Call vs. Typical Range" value={m.costPerAgentCall} benchmark={0.15} min={0} max={0.50} prefix="$" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Optimize your AI agent costs" />
          <div className="flex gap-3 mt-4"><ShareButton slug="ai-agent-cost-estimator" inputs={inputs} /></div>
        </div>
      </div>
      {isReverse && (<div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Budget Target &mdash; How to stay within your monthly budget</h3>
        <div className="mb-4"><label className="text-sm text-label">Target Monthly Budget</label><div className="flex items-center gap-2 mt-1"><span className="text-label">$</span><input type="number" value={goalBudget} onChange={(e) => setGoalBudget(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{reverseScenarios.map((sc, i) => (<div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>{i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Smallest change needed</span>}<h4 className="text-sm font-semibold text-foreground mt-1">{sc.label}</h4><p className="text-xs text-label mt-1">{sc.description}</p><p className="text-xs font-mono mt-2 text-label">Change: <span className={sc.change > 0 ? 'text-danger' : 'text-success'}>{sc.change > 0 ? '+' : ''}{sc.change.toFixed(1)}%</span></p></div>))}</div>
        <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
      </div>)}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />
      <RiskRadar inputs={inputs} labels={{ agentCallsPerDay: 'Calls/Day', avgStepsPerCall: 'Steps/Call', avgInputTokensPerStep: 'Input Tokens/Step', avgOutputTokensPerStep: 'Output Tokens/Step', modelInputCostPer1M: 'Input $/1M', modelOutputCostPer1M: 'Output $/1M', toolCallsPerStep: 'Tool Calls/Step', toolCallCostEach: 'Tool Call Cost' }} calculateFn={calcCost} resultLabel="monthly cost (inverted)" />
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding AI Agent Costs</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>AI agents represent a paradigm shift from single-shot LLM queries to autonomous, multi-step workflows. An AI agent does not just answer a question &mdash; it plans, reasons, calls external tools (search engines, databases, APIs, code interpreters), evaluates results, and iterates until the task is complete. This power comes at a cost: each agent invocation may trigger 5, 10, or even 20+ sequential LLM calls, each consuming input and output tokens, plus external tool call fees. Understanding and forecasting these costs is critical for any team deploying agents in production.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">The Cost Anatomy of an Agent Call</h3>
          <p>Each agent call consists of multiple steps. At each step, the agent sends context to the LLM (input tokens &mdash; including the conversation history, tool results, and system prompt) and receives a response (output tokens &mdash; the model&apos;s reasoning and action). The agent then executes any tool calls (web search, database queries, API requests) before proceeding to the next step. Total cost = sum of LLM costs across all steps + sum of all tool call costs. The input token count grows with each step as conversation history accumulates, making later steps progressively more expensive.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Cost Drivers and Benchmarks</h3>
          <p>The three biggest cost drivers are: (1) steps per call &mdash; this is the primary multiplier, (2) model pricing &mdash; flagship models cost 10-50x more than budget models per token, and (3) context growth &mdash; as the agent accumulates history, input tokens per step increase. Industry benchmarks show typical agent call costs ranging from $0.05 for simple 2-3 step workflows with budget models to $0.50+ for complex 10+ step workflows with flagship models. For teams building AI agents for marketing automation, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides marketing data APIs that integrate well with agent tool-calling workflows</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing Agent Infrastructure Costs</h3>
          <p>The most effective optimization strategies mirror software engineering best practices: set maximum step limits to prevent runaway agents, implement model cascading (cheap model for planning, expensive model for final output), cache tool call results across agent runs, use context compression to keep input tokens manageable, and design clear stopping conditions. At scale, batch processing and async execution can reduce costs by 30-50% through provider batch API discounts. To measure how your agent costs translate to business outcomes, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s analytics to track the marketing ROI of your AI-powered automation</a>.</p>
        </div>
      </div>
      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="ai-agent-cost-estimator" />
      <PreRelatedCTA toolSlug="ai-agent-cost-estimator" />
      <RelatedTools currentSlug="ai-agent-cost-estimator" />
    </div>
  );
}
