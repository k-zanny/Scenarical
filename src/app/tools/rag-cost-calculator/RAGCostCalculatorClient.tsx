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
  documentsCount: 10000,
  avgDocTokens: 500,
  embeddingCostPer1M: 0.10,
  vectorDBMonthlyCost: 50,
  queriesPerDay: 200,
  chunksPerQuery: 5,
  llmInputCostPer1M: 3.00,
  llmOutputCostPer1M: 15.00,
  avgQueryTokens: 200,
  avgResponseTokens: 500,
};

type Inputs = typeof defaults;

interface Scenario { id: string; label: string; inputs: Inputs; }

/* ================================================================== */
/*  FAQs                                                               */
/* ================================================================== */
const faqs = [
  {
    question: 'What is the biggest cost driver in a RAG pipeline?',
    answer: 'For most RAG systems, LLM inference costs dominate the monthly bill, typically accounting for 60-80% of ongoing costs. The retrieved context chunks are prepended to each query, significantly inflating input token counts. Reducing the number of chunks per query or using a cheaper LLM for simple queries are the highest-leverage optimizations.',
  },
  {
    question: 'How much does embedding cost compared to LLM inference?',
    answer: 'Embedding is a one-time cost that is typically very small compared to ongoing LLM inference. Embedding 10,000 documents at 500 tokens each costs roughly $0.50 at standard rates. By contrast, querying those documents 200 times per day with an LLM can cost $50-200+ per month depending on the model.',
  },
  {
    question: 'How many chunks should I retrieve per query?',
    answer: 'The optimal number of chunks depends on your use case. More chunks provide more context but increase LLM costs linearly. Start with 3-5 chunks and measure answer quality. Many applications find that 3-4 well-selected chunks perform nearly as well as 8-10 chunks, at significantly lower cost.',
  },
  {
    question: 'Can I reduce RAG costs without sacrificing quality?',
    answer: 'Yes. Key strategies include: using a reranker to select fewer but more relevant chunks, caching frequent query results, using smaller models for simple factual queries while routing complex queries to larger models, and optimizing chunk size to avoid including irrelevant text in your retrieved context.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  // Indexing (one-time)
  const totalDocTokens = inp.documentsCount * inp.avgDocTokens;
  const embeddingCost = (totalDocTokens / 1e6) * inp.embeddingCostPer1M;

  // Monthly query costs
  const monthlyQueries = inp.queriesPerDay * 30;
  const retrievalTokensPerQuery = inp.chunksPerQuery * inp.avgDocTokens;
  const llmInputPerQuery = inp.avgQueryTokens + retrievalTokensPerQuery;
  const monthlyLLMInputCost = (monthlyQueries * llmInputPerQuery / 1e6) * inp.llmInputCostPer1M;
  const monthlyLLMOutputCost = (monthlyQueries * inp.avgResponseTokens / 1e6) * inp.llmOutputCostPer1M;
  const monthlyLLMCost = monthlyLLMInputCost + monthlyLLMOutputCost;

  // Total
  const monthlyTotalCost = monthlyLLMCost + inp.vectorDBMonthlyCost;
  const annualCost = monthlyTotalCost * 12 + embeddingCost;
  const costPerQuery = monthlyQueries > 0 ? monthlyTotalCost / monthlyQueries : 0;

  return { totalDocTokens, embeddingCost, monthlyQueries, retrievalTokensPerQuery, llmInputPerQuery, monthlyLLMInputCost, monthlyLLMOutputCost, monthlyLLMCost, monthlyTotalCost, annualCost, costPerQuery };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function RAGCostCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalCostPerQuery, setGoalCostPerQuery] = useState(0.01);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('rag-cost-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('rag-cost-calculator', inputs); }, [inputs]);

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
    const mq = (inp.queriesPerDay || 0) * 30;
    const retTok = (inp.chunksPerQuery || 0) * (inp.avgDocTokens || 0);
    const inpPerQ = (inp.avgQueryTokens || 0) + retTok;
    const llmIn = (mq * inpPerQ / 1e6) * (inp.llmInputCostPer1M || 0);
    const llmOut = (mq * (inp.avgResponseTokens || 0) / 1e6) * (inp.llmOutputCostPer1M || 0);
    return -(llmIn + llmOut + (inp.vectorDBMonthlyCost || 0));
  }, []);

  // Reverse goal
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    const targetMonthlyCost = goalCostPerQuery * m.monthlyQueries;
    // Path 1: Reduce chunks
    if (m.monthlyLLMCost > 0) {
      const currentLLMPerQuery = m.monthlyLLMCost / m.monthlyQueries;
      const targetLLMPerQuery = goalCostPerQuery - (inputs.vectorDBMonthlyCost / m.monthlyQueries);
      const ratio = targetLLMPerQuery > 0 ? targetLLMPerQuery / currentLLMPerQuery : 0;
      const neededChunks = Math.max(1, Math.floor(inputs.chunksPerQuery * ratio));
      results.push({ label: 'Reduce Chunks/Query', description: `Reduce from ${inputs.chunksPerQuery} to ${neededChunks} chunks per query`, change: inputs.chunksPerQuery > 0 ? ((neededChunks - inputs.chunksPerQuery) / inputs.chunksPerQuery) * 100 : 0 });
    }
    // Path 2: Use cheaper LLM
    const neededInputCost = targetMonthlyCost > inputs.vectorDBMonthlyCost ? ((targetMonthlyCost - inputs.vectorDBMonthlyCost) * (m.monthlyLLMInputCost / m.monthlyLLMCost)) / (m.monthlyQueries * m.llmInputPerQuery / 1e6) : 0;
    results.push({ label: 'Use Cheaper LLM', description: `Need input cost at $${neededInputCost.toFixed(2)}/1M tokens`, change: inputs.llmInputCostPer1M > 0 ? ((neededInputCost - inputs.llmInputCostPer1M) / inputs.llmInputCostPer1M) * 100 : 0 });
    // Path 3: Reduce query volume
    const neededQueries = m.costPerQuery > 0 ? Math.floor(targetMonthlyCost / m.costPerQuery) : 0;
    const neededPerDay = Math.floor(neededQueries / 30);
    results.push({ label: 'Reduce Query Volume', description: `Reduce to ${neededPerDay} queries/day`, change: inputs.queriesPerDay > 0 ? ((neededPerDay - inputs.queriesPerDay) / inputs.queriesPerDay) * 100 : 0 });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Embedding (One-time)', 'Vector DB (Monthly)', 'LLM Input (Monthly)', 'LLM Output (Monthly)'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.embeddingCost, s.inputs.vectorDBMonthlyCost, s.metrics.monthlyLLMInputCost, s.metrics.monthlyLLMOutputCost],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}99`,
        `${scenarioColors[idx]}80`,
        `${scenarioColors[idx]}B3`,
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
            return `${ctx.dataset.label}: ${formatCurrency(v)}`;
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
    if (m.costPerQuery > 0.05) {
      return { status: 'danger', title: `Cost per query of ${formatCurrency(m.costPerQuery, 3)} is high. Most RAG systems target under $0.02/query.`, actions: [
        { icon: '\uD83D\uDCA1', text: 'Reduce chunks per query. Fewer, better-selected chunks can maintain quality at lower cost.', affiliateText: 'Optimize your data pipeline with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\u2702\uFE0F', text: 'Switch to a cheaper LLM for simple factual queries. Route only complex queries to expensive models.' },
        { icon: '\uD83D\uDCBE', text: 'Implement response caching for frequently asked questions to avoid redundant LLM calls.' },
      ] };
    }
    if (m.costPerQuery > 0.02) {
      return { status: 'warning', title: `Cost per query of ${formatCurrency(m.costPerQuery, 3)} is above the typical $0.02 benchmark.`, actions: [
        { icon: '\uD83D\uDCCA', text: 'Optimize chunk size and count. Test whether 3 chunks perform comparably to 5 for your use case.' },
        { icon: '\uD83E\uDDEA', text: 'Try a reranker to select better chunks, allowing fewer chunks per query without quality loss.', affiliateText: 'Build smarter AI systems with Semrush data', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDD04', text: 'Consider hybrid search (keyword + vector) to improve retrieval precision and reduce needed chunks.' },
      ] };
    }
    if (m.costPerQuery > 0.005) {
      return { status: 'good', title: `Cost per query of ${formatCurrency(m.costPerQuery, 3)} is below the industry benchmark. Your RAG pipeline is cost-efficient.`, actions: [
        { icon: '\uD83D\uDCC8', text: 'You have room to increase query volume or add more documents without major cost impact.' },
        { icon: '\uD83D\uDD0D', text: 'Consider testing a more capable model on a subset of queries to see if answer quality improves.', affiliateText: 'Enhance your AI content with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83D\uDCDA', text: 'Expand your knowledge base with more documents to improve coverage and answer quality.' },
      ] };
    }
    return { status: 'excellent', title: `Cost per query of ${formatCurrency(m.costPerQuery, 3)} is excellent. Your pipeline is highly optimized.`, actions: [
      { icon: '\uD83D\uDE80', text: 'Scale aggressively. At this cost level, RAG is viable for even high-volume consumer applications.', affiliateText: 'Scale your AI with Semrush marketing data', affiliateUrl: affiliateData.partners.semrush.url },
      { icon: '\uD83E\uDDE0', text: 'Experiment with multi-step retrieval or agent patterns that would increase cost but improve answer quality.' },
      { icon: '\uD83D\uDCE6', text: 'Consider offering RAG as a premium feature in your product at strong margins.' },
    ] };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">RAG Cost Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate the full cost of your Retrieval-Augmented Generation pipeline. Model embedding,
          vector database, and LLM inference costs to optimize your RAG system&apos;s unit economics.
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

          <ScenarioSlider label="Number of Documents" value={inputs.documentsCount} min={100} max={1000000} step={100} onChange={(v) => update('documentsCount', v)} benchmarkChips={[{ label: '1K', value: 1000 }, { label: '10K', value: 10000 }, { label: '100K', value: 100000 }]} />
          <ScenarioSlider label="Queries per Day" value={inputs.queriesPerDay} min={1} max={10000} step={1} onChange={(v) => update('queriesPerDay', v)} benchmarkChips={[{ label: '50', value: 50 }, { label: '200', value: 200 }, { label: '1K', value: 1000 }, { label: '5K', value: 5000 }]} />
          <ScenarioSlider label="Chunks Retrieved / Query" value={inputs.chunksPerQuery} min={1} max={20} step={1} benchmark={benchmarks.ai_llm.avg_chunks_per_query} benchmarkLabel="Typical" onChange={(v) => update('chunksPerQuery', v)} />

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider label="Avg Document Tokens" value={inputs.avgDocTokens} min={50} max={5000} step={50} onChange={(v) => update('avgDocTokens', v)} />
              <ScenarioSlider label="Embedding Cost ($/1M tokens)" value={inputs.embeddingCostPer1M} min={0.01} max={1.00} step={0.01} prefix="$" onChange={(v) => update('embeddingCostPer1M', v)} />
              <ScenarioSlider label="Vector DB Monthly Cost" value={inputs.vectorDBMonthlyCost} min={0} max={500} step={5} prefix="$" onChange={(v) => update('vectorDBMonthlyCost', v)} />
              <ScenarioSlider label="LLM Input Cost ($/1M tokens)" value={inputs.llmInputCostPer1M} min={0.05} max={20} step={0.05} prefix="$" onChange={(v) => update('llmInputCostPer1M', v)} />
              <ScenarioSlider label="LLM Output Cost ($/1M tokens)" value={inputs.llmOutputCostPer1M} min={0.10} max={80} step={0.10} prefix="$" onChange={(v) => update('llmOutputCostPer1M', v)} />
              <ScenarioSlider label="Avg Query Tokens" value={inputs.avgQueryTokens} min={50} max={2000} step={10} onChange={(v) => update('avgQueryTokens', v)} />
              <ScenarioSlider label="Avg Response Tokens" value={inputs.avgResponseTokens} min={50} max={4000} step={50} onChange={(v) => update('avgResponseTokens', v)} />
            </div>
          )}
        </div>

        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Monthly Cost" value={formatCurrency(m.monthlyTotalCost)} subtitle={`${formatCurrency(m.annualCost)}/year`} color={m.costPerQuery <= 0.02 ? 'green' : m.costPerQuery <= 0.05 ? 'amber' : 'red'} />
              <KPICard title="Cost per Query" value={formatCurrency(m.costPerQuery, 3)} subtitle={`${formatNumber(m.monthlyQueries)} queries/mo`} color={m.costPerQuery <= 0.02 ? 'green' : 'amber'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Setup Cost" value={formatCurrency(m.embeddingCost)} subtitle={`${formatNumber(inputs.documentsCount)} docs embedded`} color="blue" />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><p className="text-[10px] text-muted uppercase">Monthly Cost</p><p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.monthlyTotalCost)}</p></div>
                    <div><p className="text-[10px] text-muted uppercase">Cost/Query</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.costPerQuery, 3)}</p></div>
                    <div><p className="text-[10px] text-muted uppercase">Setup</p><p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.embeddingCost)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="rag-cost-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">RAG Cost Breakdown</h3>
            <div className="h-80 sm:h-96"><Bar data={chartData} options={chartOptions} /></div>
          </div>

          <BenchmarkGauge label="Your Cost/Query vs. Typical RAG Benchmark" value={m.costPerQuery} benchmark={0.02} min={0} max={0.10} prefix="$" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Power your RAG with marketing data" />

          <div className="flex gap-3 mt-4"><ShareButton slug="rag-cost-calculator" inputs={inputs} /></div>
        </div>
      </div>

      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cost Target &mdash; How to reach your cost-per-query goal</h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Cost per Query</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input type="number" value={goalCostPerQuery} step={0.001} onChange={(e) => setGoalCostPerQuery(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
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

      <RiskRadar inputs={inputs} labels={{ documentsCount: 'Documents', avgDocTokens: 'Doc Tokens', queriesPerDay: 'Queries/Day', chunksPerQuery: 'Chunks/Query', llmInputCostPer1M: 'LLM Input Cost', llmOutputCostPer1M: 'LLM Output Cost', vectorDBMonthlyCost: 'Vector DB Cost', avgQueryTokens: 'Query Tokens', avgResponseTokens: 'Response Tokens', embeddingCostPer1M: 'Embedding Cost' }} calculateFn={calcProfit} resultLabel="monthly cost (inverted)" />

      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding RAG Pipeline Costs</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>Retrieval-Augmented Generation (RAG) has become the standard architecture for building AI applications that need access to private or up-to-date information. By retrieving relevant documents and injecting them into the LLM context, RAG systems can answer questions about your specific data without expensive model fine-tuning. But the costs of a RAG pipeline are often underestimated, especially the ongoing LLM inference costs that scale with query volume.</p>
          <p>A RAG pipeline has three main cost components: embedding (one-time), vector database hosting (monthly fixed), and LLM inference (monthly variable). Embedding costs are typically negligible &mdash; even large document collections cost only a few dollars to embed. Vector database costs depend on your provider and data volume but are usually $20-100/month for moderate workloads. The dominant cost is LLM inference, because each query sends both the user question and the retrieved context to the LLM.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing RAG Economics</h3>
          <p>The single most impactful optimization is reducing the number of tokens sent to the LLM per query. This means retrieving fewer but more relevant chunks (using rerankers), keeping chunk sizes small, and writing concise system prompts. A well-optimized pipeline retrieving 3 chunks at 300 tokens each costs roughly half as much as one retrieving 5 chunks at 500 tokens each &mdash; often with comparable answer quality. For building RAG systems that leverage competitive marketing data, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides structured data APIs ideal for RAG knowledge bases</a>.</p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Choosing the Right LLM for RAG</h3>
          <p>Not every RAG query requires a flagship model. Simple factual lookups can be handled by budget models at 10-20x lower cost, while complex analytical queries benefit from more capable models. Implementing a query classifier that routes to the appropriate model tier can reduce LLM costs by 50-70% without meaningful quality degradation. Caching is another high-impact strategy &mdash; if 20% of your queries are repeated, caching alone cuts LLM costs by 20%.</p>
          <p>When evaluating your RAG costs, compare against the typical benchmark of $0.02 per query. If your cost per query is significantly above this, focus on the cost breakdown chart to identify whether LLM input costs (driven by retrieved context size), LLM output costs (driven by response length), or vector DB costs are the primary driver. For organizations building marketing intelligence RAG systems, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush data feeds provide high-quality, structured content that improves retrieval precision and reduces chunk waste</a>.</p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="rag-cost-calculator" />
      <PreRelatedCTA toolSlug="rag-cost-calculator" />
      <RelatedTools currentSlug="rag-cost-calculator" />
    </div>
  );
}
