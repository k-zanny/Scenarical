'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlyRetainer: 3000,
  hoursPerMonth: 40,
  hourlyTeamCost: 50,
  toolsCostPerMonth: 200,
  scopeCreepPercent: 15,
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
    question: 'What is a good profit margin for client work?',
    answer: 'For freelancers, a healthy profit margin is 35-50% after accounting for all labor and tool costs. Agencies typically target 20-40% margins. If your margin falls below 20%, you are likely undercharging, over-delivering, or experiencing significant scope creep. Use this calculator to model how pricing adjustments or scope controls impact your bottom line.',
  },
  {
    question: 'How do I account for scope creep in pricing?',
    answer: 'The best approach is to build a scope creep buffer into your pricing from the start. If historical data shows 15% scope creep, price your projects assuming 115% of estimated hours. Alternatively, define a clear scope of work, set change order fees for out-of-scope requests, and track actual vs. estimated hours monthly to adjust future pricing.',
  },
  {
    question: 'What is effective hourly rate and why does it matter?',
    answer: 'Your effective hourly rate is your total revenue divided by actual hours worked (including scope creep). It reveals your true earning rate, which is always lower than your quoted hourly rate when working on fixed-price or retainer contracts. If your effective rate drops below your cost per hour, you are losing money on the client.',
  },
  {
    question: 'When should I fire an unprofitable client?',
    answer: 'Consider parting ways when a client consistently produces negative or near-zero margins after multiple attempts to address scope, pricing, or workload issues. Before firing them, try raising your rate, tightening scope controls, or reducing service levels. If the client is a major revenue source, transition gradually while replacing them with more profitable work.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const totalRevenue = inp.monthlyRetainer;
  const actualHours = inp.hoursPerMonth * (1 + inp.scopeCreepPercent / 100);
  const laborCost = actualHours * inp.hourlyTeamCost;
  const totalCosts = laborCost + inp.toolsCostPerMonth;
  const profit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const effectiveHourlyRate = actualHours > 0 ? totalRevenue / actualHours : 0;
  const annualProfit = profit * 12;
  return { totalRevenue, actualHours, laborCost, totalCosts, profit, profitMargin, effectiveHourlyRate, annualProfit };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function ClientProfitabilityClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalProfit, setGoalProfit] = useState(2000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('client-profitability-calculator');
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
    saveToLocalStorage('client-profitability-calculator', inputs);
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
    const actualH = (inp.hoursPerMonth || 0) * (1 + (inp.scopeCreepPercent || 0) / 100);
    const labor = actualH * (inp.hourlyTeamCost || 0);
    return (inp.monthlyRetainer || 0) - labor - (inp.toolsCostPerMonth || 0);
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Increase retainer
    const neededRetainer = m.totalCosts + goalProfit;
    results.push({
      label: 'Raise Retainer',
      description: `Increase retainer to ${formatCurrency(neededRetainer)}/mo`,
      change: inputs.monthlyRetainer > 0 ? ((neededRetainer - inputs.monthlyRetainer) / inputs.monthlyRetainer) * 100 : 0,
    });
    // Path 2: Reduce hours
    const targetCosts = inputs.monthlyRetainer - goalProfit - inputs.toolsCostPerMonth;
    const targetActualHours = inputs.hourlyTeamCost > 0 ? targetCosts / inputs.hourlyTeamCost : 0;
    const targetBaseHours = targetActualHours / (1 + inputs.scopeCreepPercent / 100);
    results.push({
      label: 'Reduce Hours',
      description: `Cut to ${Math.max(0, targetBaseHours).toFixed(0)} base hours/mo`,
      change: inputs.hoursPerMonth > 0 ? ((targetBaseHours - inputs.hoursPerMonth) / inputs.hoursPerMonth) * 100 : 0,
    });
    // Path 3: Eliminate scope creep
    const targetActualHoursNoCreep = inputs.hourlyTeamCost > 0 ? (inputs.monthlyRetainer - goalProfit - inputs.toolsCostPerMonth) / inputs.hourlyTeamCost : 0;
    const targetScopeCreep = inputs.hoursPerMonth > 0 ? ((targetActualHoursNoCreep / inputs.hoursPerMonth) - 1) * 100 : 0;
    results.push({
      label: 'Control Scope Creep',
      description: `Reduce scope creep to ${Math.max(0, targetScopeCreep).toFixed(0)}%`,
      change: inputs.scopeCreepPercent > 0 ? ((Math.max(0, targetScopeCreep) - inputs.scopeCreepPercent) / inputs.scopeCreepPercent) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Revenue', 'Labor Cost', 'Tools Cost', 'Profit'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.totalRevenue, s.metrics.laborCost, s.inputs.toolsCostPerMonth, s.metrics.profit],
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
    if (m.profitMargin < 0) {
      return {
        status: 'danger',
        title: `Profit margin of ${m.profitMargin.toFixed(0)}% \u2014 you are losing money on this client.`,
        actions: [
          {
            icon: '\u{1F6A8}',
            text: 'Raise your retainer immediately or restructure the engagement \u2014 you cannot sustain negative margins.',
            affiliateText: 'Find higher-paying clients with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F4CB}', text: 'Audit actual hours vs. contracted scope \u2014 identify where scope creep is destroying your margins.' },
          { icon: '\u2702\uFE0F', text: 'Reduce service levels to match the retainer, or implement strict change order processes.' },
        ],
      };
    }
    if (m.profitMargin < 20) {
      return {
        status: 'warning',
        title: `Profit margin of ${m.profitMargin.toFixed(0)}% is thin \u2014 below the 35% freelance benchmark.`,
        actions: [
          { icon: '\u{1F4B0}', text: 'Propose a rate increase at your next renewal \u2014 frame it around the value and results you deliver.' },
          {
            icon: '\u23F1\uFE0F',
            text: 'Track time meticulously to find efficiency gains \u2014 automate repetitive tasks and templatize deliverables.',
            affiliateText: 'Automate SEO reporting with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F4DD}', text: 'Tighten your scope of work \u2014 define deliverables explicitly and charge for anything outside scope.', link: '/tools/freelance-rate-calculator' },
        ],
      };
    }
    if (m.profitMargin < 50) {
      return {
        status: 'good',
        title: `Profit margin of ${m.profitMargin.toFixed(0)}% is healthy \u2014 at or above the industry benchmark.`,
        actions: [
          { icon: '\u{1F4C8}', text: 'Look for upsell opportunities \u2014 additional services or premium deliverables can increase revenue without proportional cost increases.' },
          {
            icon: '\u{1F504}',
            text: 'Systematize your delivery process to maintain margins as you scale to more clients.',
            affiliateText: 'Streamline client SEO with Semrush',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '\u{1F3AF}', text: 'Use this client as a case study to attract similar high-margin clients.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Profit margin of ${m.profitMargin.toFixed(0)}% is exceptional \u2014 excellent unit economics.`,
      actions: [
        {
          icon: '\u{1F680}',
          text: 'Replicate this client profile \u2014 analyze what makes them profitable and target similar prospects.',
          affiliateText: 'Find ideal prospects with Semrush',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '\u{1F4E6}', text: 'Consider productizing your service \u2014 high margins suggest strong market fit for a scalable offering.' },
        { icon: '\u{1F48E}', text: 'Invest in deepening the relationship \u2014 high-margin clients are your most valuable assets.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Client Profitability Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate the true profitability of each client engagement. Account for scope
          creep, tool costs, and actual hours worked to find your effective hourly rate
          and profit margin &mdash; then benchmark against industry averages.
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
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>

          {/* Basic Inputs */}
          <ScenarioSlider label="Monthly Retainer" value={inputs.monthlyRetainer} min={100} max={50000} step={50} prefix="$" onChange={(v) => update('monthlyRetainer', v)} benchmarkChips={[{ label: '$1K', value: 1000 }, { label: '$3K', value: 3000 }, { label: '$5K', value: 5000 }, { label: '$10K', value: 10000 }, { label: '$20K', value: 20000 }]} />
          <ScenarioSlider label="Hours per Month" value={inputs.hoursPerMonth} min={1} max={200} step={1} onChange={(v) => update('hoursPerMonth', v)} benchmarkChips={[{ label: '10h', value: 10 }, { label: '20h', value: 20 }, { label: '40h', value: 40 }, { label: '80h', value: 80 }, { label: '160h', value: 160 }]} />
          <ScenarioSlider label="Hourly Team Cost" value={inputs.hourlyTeamCost} min={5} max={300} step={1} prefix="$" onChange={(v) => update('hourlyTeamCost', v)} />

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
              <ScenarioSlider label="Tools Cost / Month" value={inputs.toolsCostPerMonth} min={0} max={5000} step={10} prefix="$" onChange={(v) => update('toolsCostPerMonth', v)} />
              <ScenarioSlider label="Scope Creep" value={inputs.scopeCreepPercent} min={0} max={100} step={1} suffix="%" onChange={(v) => update('scopeCreepPercent', v)} benchmarkChips={[{ label: '0%', value: 0 }, { label: '10%', value: 10 }, { label: '15%', value: 15 }, { label: '25%', value: 25 }, { label: '50%', value: 50 }]} />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Monthly Profit" value={formatCurrency(m.profit)} subtitle={`Annual: ${formatCurrency(m.annualProfit)}`} color={m.profit > 0 ? 'green' : 'red'} />
              <KPICard title="Profit Margin" value={`${m.profitMargin.toFixed(1)}%`} subtitle={m.profitMargin >= 35 ? 'Above benchmark' : 'Below 35% avg'} color={m.profitMargin >= 35 ? 'green' : m.profitMargin >= 20 ? 'amber' : 'red'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Effective $/hr" value={formatCurrency(m.effectiveHourlyRate)} subtitle={`${m.actualHours.toFixed(0)} actual hrs/mo`} color={m.effectiveHourlyRate >= inputs.hourlyTeamCost * 1.5 ? 'green' : m.effectiveHourlyRate >= inputs.hourlyTeamCost ? 'amber' : 'red'} />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Profit</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.profit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Margin</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.profitMargin >= 35 ? 'text-success' : 'text-danger'}`}>{s.metrics.profitMargin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Eff. $/hr</p>
                      <p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.effectiveHourlyRate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="client-profitability-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Revenue vs. Cost Breakdown</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge label="Your Profit Margin vs. Freelance Average" value={m.profitMargin} benchmark={benchmarks.freelance.avg_project_profit_margin} min={-50} max={80} suffix="%" affiliateUrl={affiliateData.partners.semrush.url} affiliateText="Find better clients" />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="client-profitability-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Profit &mdash; How to reach your monthly profit goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Profit</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input type="number" value={goalProfit} onChange={(e) => setGoalProfit(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
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
      <RiskRadar inputs={inputs} labels={{ monthlyRetainer: 'Retainer', hoursPerMonth: 'Hours/Month', hourlyTeamCost: 'Team Cost/hr', toolsCostPerMonth: 'Tools Cost', scopeCreepPercent: 'Scope Creep' }} calculateFn={calcProfit} resultLabel="monthly profit" />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Client Profitability</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Most freelancers and agencies track revenue but not profitability. Revenue tells you
            how much money comes in; profitability tells you how much you actually keep. A $10,000
            per month client generating 10% margins is less valuable than a $3,000 per month client
            generating 50% margins &mdash; and understanding that difference is the key to building a
            sustainable business. This calculator breaks down every cost component so you can see
            exactly where your money goes.
          </p>
          <p>
            The hidden profit killer for most service businesses is scope creep &mdash; the gradual
            expansion of project scope beyond what was originally agreed. Even 15% scope creep
            on a 40-hour engagement means six extra hours per month that you are not being paid
            for. Over a year, that is 72 hours of free labor. This calculator explicitly models
            scope creep so you can see its impact on your effective hourly rate and overall margins.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Calculate Effective Hourly Rate</h3>
          <p>
            Your effective hourly rate is the most honest measure of what you actually earn. It is
            calculated by dividing your total revenue by total actual hours worked &mdash; including all
            scope creep, revisions, and untracked time. The industry average profit margin for
            freelancers is approximately 35%, but top performers achieve 50% or more by pricing
            strategically, controlling scope, and using efficient workflows. To identify the most profitable service niches in your market, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s market research tools help you find high-value opportunities and position your services competitively</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Strategies for Improving Client Profitability</h3>
          <p>
            There are three levers for improving client profitability: increase revenue (raise
            retainers or add upsells), decrease costs (reduce hours through efficiency or lower
            tool costs), or eliminate scope creep (tighter contracts and change order processes).
            The highest-leverage improvement is usually scope control &mdash; it directly reduces costs
            without requiring any price negotiation. After that, systematizing your delivery through
            templates, standard operating procedures, and automation can dramatically reduce hours
            per client. For tools that help automate client reporting and reduce manual work, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s automated reporting to save hours on client deliverables</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">When to Raise Your Rates</h3>
          <p>
            If your effective hourly rate is below $75 for marketing services, you are likely
            undercharging relative to market rates. The best time to raise rates is at contract
            renewal, when you can point to results delivered. Frame increases around value rather
            than cost &mdash; show the client what their investment has produced and tie future pricing
            to continued outcomes. Most clients will accept a 10-20% increase if you have delivered
            strong results.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="client-profitability-calculator" />
      <PreRelatedCTA toolSlug="client-profitability-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="client-profitability-calculator" />
    </div>
  );
}
