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
  keywordDifficulty: 45,
  monthlySearchVolume: 5000,
  currentDA: 30,
  avgCPC: 2.50,
  contentCost: 500,
  backlinksNeeded: 10,
  backlinkCostEach: 350,
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
    question: 'What is keyword difficulty and how is it measured?',
    answer: 'Keyword difficulty (KD) is a metric that estimates how hard it would be to rank on the first page of Google for a given keyword. It typically ranges from 0 to 100 and is calculated based on the strength of the pages currently ranking — including their domain authority, backlink profiles, and content quality. A KD of 0-30 is generally considered easy, 30-60 is moderate, and 60-100 is hard. Different SEO tools calculate KD differently, so always compare within the same tool.',
  },
  {
    question: 'How does domain authority affect my ability to rank for a keyword?',
    answer: 'Domain authority (DA) is a proxy for the overall strength and trustworthiness of your website. When your DA is significantly lower than the keyword difficulty score, you will need more backlinks, better content, and more time to compete. As a rule of thumb, if the KD exceeds your DA by more than 20 points, the keyword will be very challenging to rank for without substantial link building and content investment.',
  },
  {
    question: 'How long does it take to rank for a keyword?',
    answer: 'The average time to rank on the first page is 6 to 12 months, but this varies enormously based on keyword difficulty, your domain authority, content quality, and link-building efforts. Low-difficulty keywords (KD under 20) with a DA of 30+ can sometimes rank in 2-3 months. High-difficulty keywords (KD 60+) may take 12-24 months or longer. Consistent publishing and link building accelerate timelines significantly.',
  },
  {
    question: 'Should I target low-difficulty or high-difficulty keywords?',
    answer: 'The best strategy is a mix. Start with low-difficulty, long-tail keywords to build topical authority and generate early traffic. As your DA grows and you accumulate backlinks, gradually target higher-difficulty keywords with more search volume. The ideal keyword has high search volume, low difficulty, and strong commercial intent — but these are rare. Use this calculator to evaluate the ROI of each keyword opportunity before investing.',
  },
];

/* ================================================================== */
/*  Helper: CTR lookup by position                                     */
/* ================================================================== */
function getCTRForPosition(position: number): number {
  const ctrMap: [number, number][] = [
    [1, benchmarks.seo.avg_organic_ctr_position_1],
    [2, benchmarks.seo.avg_organic_ctr_position_2],
    [3, benchmarks.seo.avg_organic_ctr_position_3],
    [5, benchmarks.seo.avg_organic_ctr_position_5],
    [10, benchmarks.seo.avg_organic_ctr_position_10],
  ];

  if (position <= 1) return ctrMap[0][1];
  if (position >= 10) return ctrMap[4][1];

  // Interpolate between known positions
  for (let i = 0; i < ctrMap.length - 1; i++) {
    const [pos1, ctr1] = ctrMap[i];
    const [pos2, ctr2] = ctrMap[i + 1];
    if (position >= pos1 && position <= pos2) {
      const ratio = (position - pos1) / (pos2 - pos1);
      return ctr1 + (ctr2 - ctr1) * ratio;
    }
  }
  return 2.4;
}

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const totalInvestment = inp.contentCost + (inp.backlinksNeeded * inp.backlinkCostEach);
  const estimatedTimeMonths = Math.ceil(inp.keywordDifficulty / 10) + Math.max(0, Math.ceil((inp.keywordDifficulty - inp.currentDA) / 5));
  const expectedPosition = inp.keywordDifficulty <= inp.currentDA
    ? Math.max(1, Math.ceil((inp.keywordDifficulty / inp.currentDA) * 5))
    : Math.min(20, Math.ceil(inp.keywordDifficulty / 5));
  const ctrAtPosition = getCTRForPosition(expectedPosition);
  const expectedMonthlyTraffic = inp.monthlySearchVolume * ctrAtPosition / 100;
  const trafficValue = expectedMonthlyTraffic * inp.avgCPC;
  const roi = totalInvestment > 0 ? ((trafficValue * 12 - totalInvestment) / totalInvestment) * 100 : 0;

  return { totalInvestment, estimatedTimeMonths, expectedPosition, ctrAtPosition, expectedMonthlyTraffic, trafficValue, roi };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function KeywordDifficultyEstimatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalTraffic, setGoalTraffic] = useState(2000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('keyword-difficulty-estimator');
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
    saveToLocalStorage('keyword-difficulty-estimator', inputs);
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
    const totalInv = (inp.contentCost || 0) + ((inp.backlinksNeeded || 0) * (inp.backlinkCostEach || 0));
    const kd = inp.keywordDifficulty || 0;
    const da = inp.currentDA || 1;
    const pos = kd <= da ? Math.max(1, Math.ceil((kd / da) * 5)) : Math.min(20, Math.ceil(kd / 5));
    const ctr = getCTRForPosition(pos);
    const traffic = (inp.monthlySearchVolume || 0) * ctr / 100;
    const value = traffic * (inp.avgCPC || 0);
    return value * 12 - totalInv;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Lower keyword difficulty target
    const neededKD = Math.min(inputs.keywordDifficulty, inputs.currentDA);
    results.push({
      label: 'Target Easier Keywords',
      description: `Target keywords with KD ≤ ${neededKD} (your current DA)`,
      change: inputs.keywordDifficulty > 0 ? ((neededKD - inputs.keywordDifficulty) / inputs.keywordDifficulty) * 100 : 0,
    });
    // Path 2: Increase search volume
    const currentCTR = m.ctrAtPosition / 100;
    const neededVolume = currentCTR > 0 ? Math.ceil(goalTraffic / currentCTR) : 0;
    results.push({
      label: 'Target Higher Volume Keywords',
      description: `Find keywords with ${formatNumber(neededVolume)}+ monthly searches`,
      change: inputs.monthlySearchVolume > 0 ? ((neededVolume - inputs.monthlySearchVolume) / inputs.monthlySearchVolume) * 100 : 0,
    });
    // Path 3: Build more backlinks to improve DA
    const neededDA = inputs.keywordDifficulty;
    const daGap = Math.max(0, neededDA - inputs.currentDA);
    results.push({
      label: 'Build Domain Authority',
      description: `Increase DA to ${neededDA} (need ~${daGap * benchmarks.seo.avg_pages_per_da_point} quality pages)`,
      change: inputs.currentDA > 0 ? ((neededDA - inputs.currentDA) / inputs.currentDA) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — traffic potential at positions 1-10
  const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: positions.map(p => `Position ${p}`),
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: positions.map(p => {
        const ctr = getCTRForPosition(p);
        return Math.round(s.inputs.monthlySearchVolume * ctr / 100);
      }),
      backgroundColor: `${scenarioColors[idx]}B3`,
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
            return `${ctx.dataset.label}: ${formatNumber(v)} visits/mo`;
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
          callback: (v: any) => Number(v).toLocaleString(),
        },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.roi < 0) {
      return {
        status: 'danger',
        title: `ROI of ${m.roi.toFixed(0)}% — this keyword will lose money at current investment levels.`,
        actions: [
          {
            icon: '🔍',
            text: 'Target lower-difficulty keywords where your current DA can compete without heavy link building.',
            affiliateText: 'Find easy-win keywords with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📉', text: 'Reduce content costs by focusing on long-tail variations with less competition.' },
          { icon: '🏗️', text: 'Build domain authority first — publish high-quality content targeting KD < 20 keywords.' },
        ],
      };
    }
    if (m.roi < 200) {
      return {
        status: 'warning',
        title: `ROI of ${m.roi.toFixed(0)}% — positive but modest return for the investment required.`,
        actions: [
          { icon: '🎯', text: 'Look for related keywords with similar intent but lower difficulty to maximize returns.' },
          {
            icon: '🔗',
            text: 'Focus link building on the most impactful placements — editorial links in relevant content.',
            affiliateText: 'Find link opportunities with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📝', text: 'Create comprehensive, 10x content to earn natural backlinks and reduce paid link costs.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    if (m.roi < 500) {
      return {
        status: 'good',
        title: `ROI of ${m.roi.toFixed(0)}% — a strong opportunity worth pursuing.`,
        actions: [
          { icon: '📈', text: 'Build a content cluster around this topic to capture related long-tail traffic.' },
          {
            icon: '🚀',
            text: 'Invest in quality backlinks to accelerate ranking and capture traffic sooner.',
            affiliateText: 'Analyze competitor backlinks with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🔄', text: 'Optimize existing content for related keywords to compound your organic traffic.', link: '/tools/seo-roi-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `ROI of ${m.roi.toFixed(0)}% — exceptional opportunity. Prioritize this keyword immediately.`,
      actions: [
        {
          icon: '⚡',
          text: 'Move fast — publish and promote content for this keyword before competitors discover it.',
          affiliateText: 'Track your rankings with Semrush → Try Free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Build a full topic cluster to capture maximum traffic from this keyword family.' },
        { icon: '💰', text: 'Consider creating a dedicated landing page to monetize this high-value traffic.', link: '/tools/landing-page-estimator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Keyword Difficulty Estimator</h1>
        <p className="text-label max-w-2xl">
          Estimate how much it will cost to rank for any keyword based on its difficulty,
          your domain authority, and backlink requirements. Compare scenarios to find the
          highest-ROI keyword opportunities for your SEO strategy.
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
            label="Keyword Difficulty (0-100)"
            value={inputs.keywordDifficulty}
            min={1}
            max={100}
            step={1}
            onChange={(v) => update('keywordDifficulty', v)}
            benchmarkChips={[
              { label: 'Easy 15', value: 15 },
              { label: 'Med 40', value: 40 },
              { label: 'Hard 65', value: 65 },
              { label: 'Very Hard 85', value: 85 },
            ]}
          />
          <ScenarioSlider
            label="Monthly Search Volume"
            value={inputs.monthlySearchVolume}
            min={10}
            max={500000}
            step={10}
            onChange={(v) => update('monthlySearchVolume', v)}
            benchmarkChips={[
              { label: '500', value: 500 },
              { label: '2K', value: 2000 },
              { label: '5K', value: 5000 },
              { label: '20K', value: 20000 },
              { label: '100K', value: 100000 },
            ]}
          />
          <ScenarioSlider
            label="Your Domain Authority"
            value={inputs.currentDA}
            min={1}
            max={100}
            step={1}
            benchmark={benchmarks.seo.avg_da_established}
            benchmarkLabel="Established site avg"
            onChange={(v) => update('currentDA', v)}
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
                label="Average CPC ($)"
                value={inputs.avgCPC}
                min={0.10}
                max={50}
                step={0.10}
                prefix="$"
                benchmark={benchmarks.seo.avg_keyword_cpc}
                benchmarkLabel="Avg CPC"
                onChange={(v) => update('avgCPC', v)}
              />
              <ScenarioSlider
                label="Content Creation Cost"
                value={inputs.contentCost}
                min={0}
                max={5000}
                step={50}
                prefix="$"
                benchmark={benchmarks.seo.avg_content_cost_per_article}
                benchmarkLabel="Avg article cost"
                onChange={(v) => update('contentCost', v)}
              />
              <ScenarioSlider
                label="Backlinks Needed"
                value={inputs.backlinksNeeded}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update('backlinksNeeded', v)}
                benchmarkChips={[
                  { label: 'Low KD 3', value: 3 },
                  { label: 'Med KD 10', value: 10 },
                  { label: 'High KD 30', value: 30 },
                ]}
              />
              <ScenarioSlider
                label="Cost per Backlink"
                value={inputs.backlinkCostEach}
                min={0}
                max={2000}
                step={25}
                prefix="$"
                benchmark={benchmarks.seo.avg_backlink_cost}
                benchmarkLabel="Avg backlink cost"
                onChange={(v) => update('backlinkCostEach', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Est. Monthly Traffic"
                value={formatNumber(Math.round(m.expectedMonthlyTraffic))}
                subtitle={`Position ${m.expectedPosition} · ${m.ctrAtPosition.toFixed(1)}% CTR`}
                color={m.expectedPosition <= 3 ? 'green' : m.expectedPosition <= 10 ? 'amber' : 'red'}
              />
              <KPICard
                title="Investment Required"
                value={formatCurrency(m.totalInvestment)}
                subtitle={`~${m.estimatedTimeMonths} months to rank`}
                color="blue"
              />
              <KPICard
                title="12-Month ROI"
                value={`${m.roi.toFixed(0)}%`}
                subtitle={m.roi > 0 ? `${formatCurrency(m.trafficValue * 12 - m.totalInvestment)} profit` : 'Negative return'}
                color={m.roi >= 500 ? 'green' : m.roi >= 100 ? 'amber' : m.roi > 0 ? 'blue' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>
                    {s.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Monthly Traffic</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatNumber(Math.round(s.metrics.expectedMonthlyTraffic))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Investment</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.totalInvestment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">12-Mo ROI</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.metrics.roi.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="keyword-difficulty-estimator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Traffic Potential by Ranking Position</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Keyword Difficulty vs Your DA"
            value={inputs.keywordDifficulty}
            benchmark={inputs.currentDA}
            min={0}
            max={100}
            suffix=""
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Find easier keywords to rank for"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="keyword-difficulty-estimator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Traffic — How to reach your monthly goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Organic Traffic</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={goalTraffic}
                onChange={(e) => setGoalTraffic(parseFloat(e.target.value) || 0)}
                className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent"
              />
              <span className="text-label text-sm">visits/month</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}
              >
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
          <button
            onClick={() => setIsReverse(false)}
            className="mt-4 text-xs text-muted hover:text-label"
          >
            Close reverse mode
          </button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={{
          keywordDifficulty: 'Keyword Difficulty',
          monthlySearchVolume: 'Search Volume',
          currentDA: 'Domain Authority',
          avgCPC: 'Avg CPC',
          contentCost: 'Content Cost',
          backlinksNeeded: 'Backlinks Needed',
          backlinkCostEach: 'Backlink Cost',
        }}
        calculateFn={calcProfit}
        resultLabel="12-month profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Keyword Difficulty</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Keyword difficulty is one of the most important metrics in SEO because it determines
            how much effort, time, and money you need to invest to rank for a given search term.
            A keyword with 50,000 monthly searches sounds attractive, but if the difficulty is 90
            and your domain authority is 20, you could spend thousands on content and links with
            little chance of reaching page one. This calculator helps you evaluate the true ROI of
            targeting any keyword by modeling the full cost of content creation, link building, and
            the expected traffic payoff.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Keyword Difficulty Affects Rankings</h3>
          <p>
            Keyword difficulty scores reflect the competitive landscape for a search term. A low
            KD (under 30) means the top-ranking pages have relatively weak backlink profiles and
            lower domain authority, making it easier for newer sites to compete. A high KD (over 60)
            indicates that established, authoritative sites dominate the results, requiring
            significant investment in content quality and link acquisition to compete. The
            relationship between your domain authority and keyword difficulty is the single biggest
            predictor of your ability to rank. To accurately assess keyword difficulty for your specific niche, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides KD scores based on real-time analysis of top-ranking pages</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Calculating the True Cost of Ranking</h3>
          <p>
            Most SEO practitioners underestimate the true cost of ranking for a keyword. Content
            creation is just one piece — you also need to factor in backlink acquisition, on-page
            optimization, technical SEO, and the opportunity cost of time. This calculator models
            both the content and link-building costs to give you a realistic investment figure.
            The average cost of a quality backlink is around ${formatCurrency(benchmarks.seo.avg_backlink_cost)},
            and the average article costs ${formatCurrency(benchmarks.seo.avg_content_cost_per_article)}.
            For highly competitive keywords, you may need 30 or more backlinks just to reach page one.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Your SEO ROI</h3>
          <p>
            The highest-ROI SEO strategy targets keywords where you have a realistic chance of
            ranking in positions 1-5 within 6-12 months. Position 1 captures {benchmarks.seo.avg_organic_ctr_position_1}%
            of clicks, while position 10 captures only {benchmarks.seo.avg_organic_ctr_position_10}%.
            This dramatic CTR difference means that moving from position 5 to position 1 can more
            than quintuple your traffic from a single keyword. Focus your budget on keywords where
            the KD is close to or below your DA, and build topical authority through content clusters
            to strengthen your position over time. For comprehensive keyword research and difficulty analysis, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s keyword research tools to find high-ROI opportunities</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="keyword-difficulty-estimator" />
      <PreRelatedCTA toolSlug="keyword-difficulty-estimator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="keyword-difficulty-estimator" />
    </div>
  );
}
