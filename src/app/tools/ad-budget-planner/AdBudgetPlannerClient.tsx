'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
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
import FAQSection, { FAQItem } from '@/components/FAQSection';
import FeedbackWidget from '@/components/FeedbackWidget';
import {
  formatCurrency,
  saveToLocalStorage,
  loadFromLocalStorage,
} from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SLUG = 'ad-budget-planner';

const CHANNEL_CONFIG = [
  { key: 'googleAdsPercent', label: 'Google Ads', benchmarkKey: 'google_ads', color: '#4285F4' },
  { key: 'facebookAdsPercent', label: 'Facebook Ads', benchmarkKey: 'facebook_ads', color: '#1877F2' },
  { key: 'instagramAdsPercent', label: 'Instagram Ads', benchmarkKey: 'instagram_ads', color: '#E4405F' },
  { key: 'linkedInAdsPercent', label: 'LinkedIn Ads', benchmarkKey: 'linkedin_ads', color: '#0A66C2' },
  { key: 'tiktokAdsPercent', label: 'TikTok Ads', benchmarkKey: 'tiktok_ads', color: '#00F2EA' },
] as const;

interface Inputs {
  totalBudget: number;
  googleAdsPercent: number;
  facebookAdsPercent: number;
  instagramAdsPercent: number;
  linkedInAdsPercent: number;
  tiktokAdsPercent: number;
  targetROAS: number;
}

const DEFAULTS: Inputs = {
  totalBudget: 10000,
  googleAdsPercent: 40,
  facebookAdsPercent: 30,
  instagramAdsPercent: 15,
  linkedInAdsPercent: 10,
  tiktokAdsPercent: 5,
  targetROAS: 3,
};

interface ChannelResult {
  label: string;
  color: string;
  budget: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
}

interface Scenario {
  id: string;
  label: string;
  inputs: Inputs;
}

const faqs: FAQItem[] = [
  {
    question: 'How should I split my ad budget across channels?',
    answer:
      'There is no one-size-fits-all split. Start by testing 60-70% of your budget on your best-performing channel and divide the remaining 30-40% among secondary channels. Use this planner to model different allocation scenarios and compare projected revenue before committing real spend. Over time, shift budget toward the channels that deliver the strongest return on ad spend for your specific audience.',
  },
  {
    question: 'What is a good blended ROAS to aim for?',
    answer:
      'A blended ROAS of 2x means you earn $2 for every $1 spent on advertising. The industry average across channels hovers around 2.0x, but profitable campaigns often target 3x or higher. Your ideal target depends on your profit margins: businesses with high gross margins (like SaaS at 70%+) can afford a lower ROAS, while low-margin e-commerce businesses may need 4x or more to stay profitable.',
  },
  {
    question: 'How accurate are the benchmark numbers used in this tool?',
    answer:
      'The benchmarks are based on aggregated industry averages from major advertising platforms and third-party studies. They provide a useful starting point, but actual performance varies significantly by industry, targeting, creative quality, and landing page experience. Treat these projections as directional estimates and update the tool with your own real data once you start running campaigns.',
  },
  {
    question: 'Should I always allocate budget to every channel?',
    answer:
      'Not necessarily. Spreading budget too thinly across many channels can prevent any single channel from gathering enough data to optimize effectively. Most platforms need a minimum daily spend (typically $20-50) to exit the learning phase. It is usually better to focus on 2-3 channels where your target audience is most active, achieve profitability there, and then expand to additional channels as budget allows.',
  },
];

/* ================================================================== */
/*  Helper: compute channel results from inputs                        */
/* ================================================================== */
function computeChannelResults(inputs: Inputs): ChannelResult[] {
  const percentSum =
    inputs.googleAdsPercent +
    inputs.facebookAdsPercent +
    inputs.instagramAdsPercent +
    inputs.linkedInAdsPercent +
    inputs.tiktokAdsPercent;

  const normalize = (pct: number) => (percentSum > 0 ? (pct / percentSum) * 100 : 0);

  return CHANNEL_CONFIG.map((ch) => {
    const rawPercent = inputs[ch.key as keyof Inputs] as number;
    const effectivePercent = normalize(rawPercent);
    const budget = (inputs.totalBudget * effectivePercent) / 100;
    const bm = benchmarks.advertising[ch.benchmarkKey as keyof typeof benchmarks.advertising];
    const clicks = budget / bm.avg_cpc;
    const conversions = (clicks * bm.avg_conversion_rate) / 100;
    const revenue = budget * bm.avg_roas;
    return {
      label: ch.label,
      color: ch.color,
      budget,
      clicks,
      conversions,
      revenue,
      roas: bm.avg_roas,
    };
  });
}

function computeAggregates(channelResults: ChannelResult[], totalBudget: number) {
  const totalExpectedRevenue = channelResults.reduce((sum, ch) => sum + ch.revenue, 0);
  const totalExpectedConversions = channelResults.reduce((sum, ch) => sum + ch.conversions, 0);
  const blendedROAS = totalBudget > 0 ? totalExpectedRevenue / totalBudget : 0;
  const totalProfit = totalExpectedRevenue - totalBudget;
  return { totalExpectedRevenue, totalExpectedConversions, blendedROAS, totalProfit };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function AdBudgetPlannerClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...DEFAULTS } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [targetRevenue, setTargetRevenue] = useState('');

  const currentScenario = scenarios.find((s) => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load from URL params or localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => {
      if (k in DEFAULTS) urlInputs[k as keyof Inputs] = parseFloat(v);
    });
    if (Object.keys(urlInputs).length > 0) {
      setScenarios((prev) => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
      return;
    }
    const saved = loadFromLocalStorage(SLUG);
    if (saved) {
      setScenarios((prev) => [{ ...prev[0], inputs: { ...DEFAULTS, ...saved } }]);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    saveToLocalStorage(SLUG, inputs as unknown as Record<string, number>);
  }, [inputs]);

  const updateInput = (key: keyof Inputs, value: number) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s
      )
    );
  };

  const handleReset = () => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenario ? { ...s, inputs: { ...DEFAULTS } } : s
      )
    );
    setTargetRevenue('');
    window.history.replaceState(null, '', '/tools/ad-budget-planner');
  };

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    const nextId = String.fromCharCode(65 + scenarios.length);
    setScenarios((prev) => [...prev, { id: nextId, label: `Scenario ${nextId}`, inputs: { ...inputs } }]);
    setActiveScenario(nextId);
  };

  const removeScenario = (id: string) => {
    if (id === 'A') return;
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    setActiveScenario('A');
  };

  const percentSum =
    inputs.googleAdsPercent +
    inputs.facebookAdsPercent +
    inputs.instagramAdsPercent +
    inputs.linkedInAdsPercent +
    inputs.tiktokAdsPercent;

  const percentWarning = Math.abs(percentSum - 100) > 0.5;

  // Channel calculations
  const channelResults: ChannelResult[] = useMemo(() => {
    return computeChannelResults(inputs);
  }, [inputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregates
  const { totalExpectedRevenue, totalExpectedConversions, blendedROAS, totalProfit } = computeAggregates(channelResults, inputs.totalBudget);

  // All scenario metrics for comparison
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const allScenarioMetrics = scenarios.map((s) => {
    const results = computeChannelResults(s.inputs);
    const agg = computeAggregates(results, s.inputs.totalBudget);
    return { ...s, results, ...agg };
  });

  // Reverse goal: target revenue -> needed budget
  const handleReverseGoal = (goalValue: number) => {
    const target = goalValue;
    if (!isNaN(target) && blendedROAS > 0) {
      const neededBudget = Math.round(target / blendedROAS);
      updateInput('totalBudget', Math.min(Math.max(neededBudget, 500), 500000));
    }
  };

  // Profit calculator for RiskRadar
  const calculateProfit = useCallback(
    (inp: Record<string, number>) => {
      let totalRev = 0;
      CHANNEL_CONFIG.forEach((ch) => {
        const rawPct = (inp[ch.key] ?? 0) as number;
        const sum =
          (inp.googleAdsPercent ?? 0) +
          (inp.facebookAdsPercent ?? 0) +
          (inp.instagramAdsPercent ?? 0) +
          (inp.linkedInAdsPercent ?? 0) +
          (inp.tiktokAdsPercent ?? 0);
        const effectivePct = sum > 0 ? (rawPct / sum) * 100 : 0;
        const budget = ((inp.totalBudget ?? 0) * effectivePct) / 100;
        const bm = benchmarks.advertising[ch.benchmarkKey as keyof typeof benchmarks.advertising];
        totalRev += budget * bm.avg_roas;
      });
      return totalRev - (inp.totalBudget ?? 0);
    },
    []
  );

  // Action panel
  const getActionStatus = (): 'danger' | 'warning' | 'good' | 'excellent' => {
    if (blendedROAS < 1.0) return 'danger';
    if (blendedROAS < 2.0) return 'warning';
    if (blendedROAS < 3.0) return 'good';
    return 'excellent';
  };

  const getActions = (): Action[] => {
    const actions: Action[] = [];

    if (blendedROAS < 2.0) {
      actions.push({
        icon: '🔄',
        text: 'Your blended ROAS is below the 2.0x industry average. Consider shifting budget toward higher-performing channels like Facebook Ads (avg 2.5x ROAS) or reducing spend on underperformers.',
        affiliateText: 'Analyze competitor ad strategy with Semrush → Try free',
        affiliateUrl: affiliateData.partners.semrush.url,
      });
    }

    const highestROASChannel = channelResults.reduce((best, ch) =>
      ch.roas > best.roas ? ch : best
    );
    const lowestROASChannel = channelResults.reduce((worst, ch) =>
      ch.roas < worst.roas && ch.budget > 0 ? ch : worst
    );

    if (lowestROASChannel.budget > 0 && lowestROASChannel.roas < highestROASChannel.roas) {
      actions.push({
        icon: '📈',
        text: `Move budget from ${lowestROASChannel.label} (${lowestROASChannel.roas}x ROAS) to ${highestROASChannel.label} (${highestROASChannel.roas}x ROAS) for better overall returns.`,
        link: '/tools/roas-calculator',
      });
    }

    if (percentWarning) {
      actions.push({
        icon: '⚖️',
        text: `Your channel percentages sum to ${percentSum.toFixed(1)}% instead of 100%. Adjust your allocations to avoid confusion between planned and actual spend.`,
      });
    }

    if (totalProfit > 0) {
      actions.push({
        icon: '💰',
        text: `Projected profit of ${formatCurrency(totalProfit)}. Consider reinvesting a portion into scaling your top channel to compound gains.`,
        affiliateText: 'Scale with data-driven insights from Semrush → Try free',
        affiliateUrl: affiliateData.partners.semrush.url,
      });
    }

    if (actions.length === 0) {
      actions.push({
        icon: '✅',
        text: 'Your budget allocation looks solid. Keep monitoring actual performance data and adjust allocations based on real results.',
      });
    }

    return actions;
  };

  // Chart data
  const doughnutData = {
    labels: channelResults.map((ch) => ch.label),
    datasets: [
      {
        data: channelResults.map((ch) => ch.budget),
        backgroundColor: channelResults.map((ch) => ch.color),
        borderColor: '#141926',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94A3B8',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 12,
          font: { size: 11 },
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
          label: (ctx: any) =>
            `${ctx.label}: ${formatCurrency(ctx.raw as number)} (${(((ctx.raw as number) / inputs.totalBudget) * 100).toFixed(1)}%)`,
        },
      },
    },
  };

  const barData = {
    labels: channelResults.map((ch) => ch.label),
    datasets: [
      {
        label: 'Budget',
        data: channelResults.map((ch) => ch.budget),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expected Revenue',
        data: channelResults.map((ch) => ch.revenue),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10B981',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#94A3B8', usePointStyle: true, pointStyleWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#141926',
        borderColor: '#283044',
        borderWidth: 1,
        titleColor: '#E8ECF4',
        bodyColor: '#94A3B8',
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => formatCurrency(Number(v)),
        },
      },
    },
  };

  const riskLabels: Record<string, string> = {
    totalBudget: 'Total Budget',
    googleAdsPercent: 'Google Ads %',
    facebookAdsPercent: 'Facebook Ads %',
    instagramAdsPercent: 'Instagram Ads %',
    linkedInAdsPercent: 'LinkedIn Ads %',
    tiktokAdsPercent: 'TikTok Ads %',
  };

  const inputsRecord = inputs as unknown as Record<string, number>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Ad Budget Planner
        </h1>
        <p className="text-label max-w-3xl text-base leading-relaxed">
          This Ad Budget Planner lets you allocate your advertising budget across channels and
          forecast performance instantly. Drag sliders to simulate different allocation strategies,
          see expected revenue by platform, and share your plan with your team — all in real time.
        </p>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN — Inputs */}
        <div className="lg:col-span-4">
          <div className="bg-surface rounded-xl border border-surface-lighter p-6 sticky top-24">
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
                  + {String.fromCharCode(65 + scenarios.length)}
                </button>
              )}
              <button
                onClick={handleReset}
                className="text-xs text-muted hover:text-label transition-colors ml-auto"
              >
                Reset
              </button>
            </div>

            {/* Basic Inputs */}
            <ScenarioSlider
              label="Total Monthly Budget"
              value={inputs.totalBudget}
              min={500}
              max={500000}
              step={500}
              prefix="$"
              onChange={(v) => updateInput('totalBudget', v)}
              benchmarkChips={[
                { label: '$2k', value: 2000 },
                { label: '$5k', value: 5000 },
                { label: '$10k', value: 10000 },
                { label: '$25k', value: 25000 },
                { label: '$50k', value: 50000 },
              ]}
            />

            <div className="mt-2 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-label">Channel Allocation</span>
                {percentWarning && (
                  <span className="text-xs text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full">
                    Sum: {percentSum.toFixed(1)}% (auto-normalized)
                  </span>
                )}
                {!percentWarning && (
                  <span className="text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                    Sum: {percentSum.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            <ScenarioSlider
              label="Google Ads"
              value={inputs.googleAdsPercent}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => updateInput('googleAdsPercent', v)}
            />
            <ScenarioSlider
              label="Facebook Ads"
              value={inputs.facebookAdsPercent}
              min={0}
              max={100}
              suffix="%"
              onChange={(v) => updateInput('facebookAdsPercent', v)}
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
                  label="Instagram Ads"
                  value={inputs.instagramAdsPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateInput('instagramAdsPercent', v)}
                />
                <ScenarioSlider
                  label="LinkedIn Ads"
                  value={inputs.linkedInAdsPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateInput('linkedInAdsPercent', v)}
                />
                <ScenarioSlider
                  label="TikTok Ads"
                  value={inputs.tiktokAdsPercent}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => updateInput('tiktokAdsPercent', v)}
                />
                <ScenarioSlider
                  label="Target ROAS"
                  value={inputs.targetROAS}
                  min={1}
                  max={10}
                  step={0.1}
                  suffix="x"
                  onChange={(v) => updateInput('targetROAS', v)}
                />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <ShareButton slug={SLUG} inputs={inputsRecord} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Results */}
        <div className="lg:col-span-8">
          {/* KPI Cards — single scenario */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <KPICard
                title="Blended ROAS"
                value={`${blendedROAS.toFixed(2)}x`}
                subtitle={blendedROAS >= inputs.targetROAS ? 'Meets your target' : `Target: ${inputs.targetROAS}x`}
                trend={blendedROAS >= inputs.targetROAS ? 'up' : 'down'}
                color={blendedROAS >= inputs.targetROAS ? 'green' : blendedROAS >= 2.0 ? 'amber' : 'red'}
              />
              <KPICard
                title="Total Expected Revenue"
                value={formatCurrency(totalExpectedRevenue)}
                subtitle={`Profit: ${formatCurrency(totalProfit)}`}
                trend={totalProfit > 0 ? 'up' : 'down'}
                color={totalProfit > 0 ? 'green' : 'red'}
                clickable
                onGoalSubmit={handleReverseGoal}
              />
              <KPICard
                title="Total Conversions"
                value={totalExpectedConversions.toFixed(0)}
                subtitle={`CPA: ${formatCurrency(totalExpectedConversions > 0 ? inputs.totalBudget / totalExpectedConversions : 0)}`}
                color="blue"
              />
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {allScenarioMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>
                    {s.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Blended ROAS</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.blendedROAS.toFixed(2)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Revenue</p>
                      <p className={`font-mono text-lg font-bold ${s.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.totalExpectedRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Profit</p>
                      <p className={`font-mono text-lg font-bold ${s.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.totalProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="ad-budget-planner" />

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface rounded-xl border border-surface-lighter p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Budget Allocation</h3>
              <div className="h-80 sm:h-96">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-lighter p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Budget vs. Expected Revenue
              </h3>
              <div className="h-80 sm:h-96">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>

          {/* Channel breakdown table */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-8 overflow-x-auto">
            <h3 className="text-sm font-semibold text-foreground mb-4">Channel Breakdown</h3>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-surface-lighter">
                  <th className="text-left py-2 text-label font-medium">Channel</th>
                  <th className="text-right py-2 text-label font-medium">Budget</th>
                  <th className="text-right py-2 text-label font-medium">Clicks</th>
                  <th className="text-right py-2 text-label font-medium">Conv.</th>
                  <th className="text-right py-2 text-label font-medium">Revenue</th>
                  <th className="text-right py-2 text-label font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {channelResults.map((ch) => (
                  <tr key={ch.label} className="border-b border-surface-lighter/50">
                    <td className="py-2.5 text-foreground whitespace-nowrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block mr-2 align-middle"
                        style={{ backgroundColor: ch.color }}
                      />
                      {ch.label}
                    </td>
                    <td className="text-right py-2.5 font-mono text-foreground">
                      {formatCurrency(ch.budget)}
                    </td>
                    <td className="text-right py-2.5 font-mono text-foreground">
                      {ch.clicks.toFixed(0)}
                    </td>
                    <td className="text-right py-2.5 font-mono text-foreground">
                      {ch.conversions.toFixed(0)}
                    </td>
                    <td className="text-right py-2.5 font-mono text-foreground">
                      {formatCurrency(ch.revenue)}
                    </td>
                    <td className="text-right py-2.5 font-mono text-foreground">
                      {ch.roas.toFixed(1)}x
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2.5 text-foreground">Total</td>
                  <td className="text-right py-2.5 font-mono text-foreground">
                    {formatCurrency(inputs.totalBudget)}
                  </td>
                  <td className="text-right py-2.5 font-mono text-foreground">
                    {channelResults.reduce((s, c) => s + c.clicks, 0).toFixed(0)}
                  </td>
                  <td className="text-right py-2.5 font-mono text-foreground">
                    {totalExpectedConversions.toFixed(0)}
                  </td>
                  <td className="text-right py-2.5 font-mono text-foreground">
                    {formatCurrency(totalExpectedRevenue)}
                  </td>
                  <td className="text-right py-2.5 font-mono text-foreground">
                    {blendedROAS.toFixed(1)}x
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Benchmark Gauge */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-4">ROAS vs. Industry Average</h3>
            <BenchmarkGauge
              label="Blended ROAS"
              value={blendedROAS}
              benchmark={2.0}
              min={0}
              max={6}
              suffix="x"
              affiliateUrl={affiliateData.partners.semrush.url}
              affiliateText="See competitor ad budgets"
            />
          </div>

        </div>
      </div>

      {/* Full-width sections below the 2-column grid */}

      {/* Action Panel */}
      <ActionPanel
        status={getActionStatus()}
        title={
          blendedROAS < 1.0
            ? 'Your ad spend is projected to lose money. Reallocate budget or reduce total spend.'
            : blendedROAS < 2.0
              ? 'You are below the industry average ROAS. Focus budget on stronger channels.'
              : blendedROAS < 3.0
                ? 'Solid performance. Fine-tune allocations to push past 3x ROAS.'
                : 'Excellent projected returns. Consider scaling your top channels.'
        }
        actions={getActions()}
      />

      {/* Risk Radar */}
      <RiskRadar
            inputs={inputsRecord}
            labels={riskLabels}
            calculateFn={calculateProfit}
            resultLabel="profit"
            resultPrefix="$"
          />

          {/* Reverse Goal Seek */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Reverse Goal: Revenue Target</h3>
            <p className="text-xs text-label mb-3">
              Enter a target monthly revenue and see how much total ad budget you need at the current
              blended ROAS of {blendedROAS.toFixed(2)}x.
            </p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-7 pr-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (targetRevenue) handleReverseGoal(parseFloat(targetRevenue) || 0);
                }}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                Calculate Budget
              </button>
            </div>
            {targetRevenue && blendedROAS > 0 && (
              <p className="text-sm text-foreground mt-3">
                To generate{' '}
                <span className="font-mono font-semibold text-success">
                  {formatCurrency(parseFloat(targetRevenue) || 0)}
                </span>{' '}
                in revenue, you need a total ad budget of approximately{' '}
                <span className="font-mono font-semibold text-accent">
                  {formatCurrency(Math.round((parseFloat(targetRevenue) || 0) / blendedROAS))}
                </span>
                .
              </p>
            )}
          </div>

          {/* SEO Content */}
          <div className="mt-12 prose prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              How to Plan Your Advertising Budget: A Complete Guide
            </h2>
            <div className="text-sm text-label leading-relaxed space-y-4">
              <p>
                Allocating an advertising budget without a plan is one of the fastest ways to burn
                through cash. Whether you are running paid search campaigns on Google, social media
                ads on Facebook and Instagram, professional targeting on LinkedIn, or short-form
                video ads on TikTok, every dollar needs to work toward measurable business outcomes.
                The Ad Budget Planner helps you model different allocation scenarios before you
                commit a single dollar of real spend.
              </p>
              <p>
                The foundation of any advertising budget plan is understanding return on ad spend
                (ROAS). ROAS measures the revenue generated for every dollar invested in advertising.
                A blended ROAS of 2.0x is considered the industry average across digital channels,
                meaning for every $1 spent, $2 in revenue is generated. However, a 2.0x ROAS does
                not guarantee profitability — you must also account for cost of goods sold, overhead,
                and operational costs. Many direct-to-consumer brands target a 3x to 4x ROAS to
                ensure healthy profit margins after all expenses.
              </p>
              <p>
                Each advertising channel has distinct strengths. Google Ads excels at capturing
                high-intent search traffic — users who are actively looking for a product or service.
                The average cost per click on Google is $2.69, with a conversion rate around 3.75%.
                Facebook Ads offers powerful demographic and interest-based targeting, with a lower
                average CPC of $1.72 and a notably higher average conversion rate of 9.21%, making
                it efficient for top-of-funnel campaigns. Instagram, owned by Meta, tends to command
                a higher CPC ($3.56) but works well for visually-driven brands. LinkedIn Ads, at an
                average CPC of $5.26, is significantly more expensive but delivers access to
                professional audiences that are difficult to reach elsewhere — ideal for B2B
                marketers. TikTok Ads are the newest entrant with the lowest average CPC at $1.00,
                though conversion rates are still maturing as the platform evolves its advertising
                infrastructure.
              </p>
              <p>
                A common mistake is spreading budget evenly across all channels. In practice, a
                concentrated approach usually outperforms. Start by identifying the one or two
                channels where your target audience is most active and allocate 60-70% of your
                budget there. Use the remaining 30-40% to test secondary channels. As you gather
                performance data, shift budget toward the channels that deliver the best return. This
                planner lets you model these shifts instantly so you can see projected outcomes
                before making changes in your ad accounts. For data-driven budget planning, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s advertising research reveals exactly where competitors allocate their budgets</a>.
              </p>
              <p>
                Budget planning also requires understanding minimum effective spend. Most ad
                platforms use machine learning algorithms that need a minimum number of conversions
                to exit the learning phase — typically 50 conversions per week for Facebook and 15
                conversions per month for Google. If your budget is too thin on a particular channel,
                the algorithm never optimizes properly and your cost per acquisition stays
                artificially high. Use this planner to ensure each channel receives enough budget to
                be viable.
              </p>
              <p>
                Risk assessment is another critical dimension. The Risk Radar in this tool shows how
                sensitive your projected profit is to changes in each variable. If a 15% decrease in
                your total budget causes a disproportionate drop in profit, your margins are thin and
                you may be over-leveraged on advertising. Conversely, if adjusting a single channel
                allocation barely moves the needle, that channel may not warrant its current spend. To validate your allocation strategy, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s competitive analysis to benchmark your spend against industry leaders</a>.
              </p>
              <p>
                For advanced planning, use the reverse goal feature. Enter your target monthly
                revenue and the tool calculates the total ad budget required at your current blended
                ROAS. This is particularly useful for fundraising discussions, board presentations,
                or annual planning where you need to back into marketing spend from revenue targets.
                Remember that these projections are based on industry averages — your actual
                performance will vary based on creative quality, landing page experience, audience
                targeting, and competitive dynamics in your market.
              </p>
            </div>
          </div>

      {/* FAQ Section */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="ad-budget-planner" />
      {/* Related Tools */}
      <PreRelatedCTA toolSlug="ad-budget-planner" />
      <RelatedTools currentSlug={SLUG} />
    </div>
  );
}
