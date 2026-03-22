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
import { formatCurrency, formatPercent, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  impressions: 100000,
  clicks: 3000,
  conversions: 100,
  adSpend: 5000,
  avgOrderValue: 75,
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
    question: 'What is the difference between CPC, CPM, and CPA?',
    answer: 'CPC (Cost Per Click) is what you pay each time someone clicks your ad. CPM (Cost Per Mille) is the cost per 1,000 impressions — what you pay for visibility regardless of clicks. CPA (Cost Per Acquisition) is what you pay for each conversion or customer acquired. CPC measures traffic cost, CPM measures awareness cost, and CPA measures customer acquisition cost.',
  },
  {
    question: 'How do I convert between CPC, CPM, and CPA?',
    answer: 'To convert CPC to CPM: CPM = CPC × CTR × 1000 (or equivalently, CPM = Ad Spend / Impressions × 1000). To convert CPC to CPA: CPA = CPC / Conversion Rate. To convert CPM to CPC: CPC = CPM / (CTR × 1000). These conversions require knowing your Click-Through Rate (CTR) and Conversion Rate.',
  },
  {
    question: 'Which pricing model should I use — CPC, CPM, or CPA?',
    answer: 'Use CPC when your goal is driving traffic and you want to pay only for engaged users. Use CPM for brand awareness campaigns where impressions matter more than clicks. Use CPA (or target CPA bidding) when you want to optimize directly for conversions and have enough conversion data for the algorithm to work effectively. Most performance marketers prefer CPA-based bidding for bottom-funnel campaigns.',
  },
  {
    question: 'What is a good CPC, CPM, and CPA?',
    answer: 'Benchmarks vary by platform: Google Ads averages $2.69 CPC, $3.12 CPM, and $48.96 CPA. Facebook Ads averages $1.72 CPC, $7.19 CPM, and $18.68 CPA. LinkedIn Ads are typically more expensive at $5.26 CPC and $6.59 CPM. What counts as "good" depends on your industry, margins, and customer lifetime value — a $50 CPA is excellent if your average customer is worth $500.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const cpc = inp.clicks > 0 ? inp.adSpend / inp.clicks : 0;
  const cpm = inp.impressions > 0 ? (inp.adSpend / inp.impressions) * 1000 : 0;
  const cpa = inp.conversions > 0 ? inp.adSpend / inp.conversions : 0;
  const ctr = inp.impressions > 0 ? (inp.clicks / inp.impressions) * 100 : 0;
  const conversionRate = inp.clicks > 0 ? (inp.conversions / inp.clicks) * 100 : 0;
  const revenue = inp.conversions * inp.avgOrderValue;
  const roas = inp.adSpend > 0 ? revenue / inp.adSpend : 0;
  return { cpc, cpm, cpa, ctr, conversionRate, revenue, roas };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function CPCCPMCPAConverterClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [targetCPA, setTargetCPA] = useState(30);

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('cpc-cpm-cpa-converter');
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
    saveToLocalStorage('cpc-cpm-cpa-converter', inputs);
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
    const conv = inp.conversions || 0;
    const aov = inp.avgOrderValue || 0;
    const spend = inp.adSpend || 0;
    return conv * aov - spend;
  }, []);

  // Reverse goal: how to reach target CPA
  const reverseScenarios = isReverse ? (() => {
    if (targetCPA <= 0) return [];
    const scenarios = [];
    // Path 1: Reduce ad spend
    const neededSpend = targetCPA * inputs.conversions;
    scenarios.push({
      label: 'Reduce Ad Spend',
      description: `Ad spend to ${formatCurrency(Math.max(0, neededSpend))}`,
      change: inputs.adSpend > 0 ? ((neededSpend - inputs.adSpend) / inputs.adSpend) * 100 : 0,
    });
    // Path 2: Increase conversions
    const neededConversions = inputs.adSpend > 0 ? inputs.adSpend / targetCPA : 0;
    scenarios.push({
      label: 'Increase Conversions',
      description: `Conversions to ${Math.ceil(neededConversions)}`,
      change: inputs.conversions > 0 ? ((neededConversions - inputs.conversions) / inputs.conversions) * 100 : 0,
    });
    // Path 3: Improve conversion rate (keep clicks, lower spend proportionally)
    const neededCR = inputs.clicks > 0 ? (neededConversions / inputs.clicks) * 100 : 0;
    scenarios.push({
      label: 'Improve Conversion Rate',
      description: `Conv. rate to ${neededCR.toFixed(2)}%`,
      change: m.conversionRate > 0 ? ((neededCR - m.conversionRate) / m.conversionRate) * 100 : 0,
    });
    return scenarios.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data: compare user metrics to platform benchmarks
  const platforms = ['Google Ads', 'Facebook Ads', 'Instagram Ads', 'LinkedIn Ads', 'TikTok Ads'];
  const platformKeys = ['google_ads', 'facebook_ads', 'instagram_ads', 'linkedin_ads', 'tiktok_ads'] as const;

  const chartData = {
    labels: ['Yours', ...platforms],
    datasets: [
      {
        label: 'CPC ($)',
        data: [
          m.cpc,
          ...platformKeys.map(k => benchmarks.advertising[k].avg_cpc),
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        borderWidth: 1,
      },
      {
        label: 'CPM ($)',
        data: [
          m.cpm,
          ...platformKeys.map(k => benchmarks.advertising[k].avg_cpm),
        ],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: '#A855F7',
        borderWidth: 1,
      },
      {
        label: 'CPA ($)',
        data: [
          m.cpa,
          ...platformKeys.map(k => {
            const b = benchmarks.advertising[k] as Record<string, number>;
            return b.avg_cpa ?? (b.avg_cpc / (b.avg_conversion_rate / 100));
          }),
        ],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#F59E0B',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94A3B8', font: { family: 'var(--font-dm-sans)' } },
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
            `${ctx.dataset.label}: $${(ctx.parsed.y ?? 0).toFixed(2)}`,
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
          callback: (v: any) => '$' + Number(v).toFixed(2),
        },
        title: { display: true, text: 'Cost ($)', color: '#94A3B8' },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    const avgCPA = benchmarks.advertising.google_ads.avg_cpa;
    if (m.cpa > avgCPA * 1.5) {
      return {
        status: 'danger',
        title: `Your CPA of ${formatCurrency(m.cpa)} is significantly above the Google Ads average of ${formatCurrency(avgCPA)}. Acquisition costs are too high.`,
        actions: [
          {
            icon: '🎯',
            text: 'Improve landing page conversion rate to get more conversions from existing clicks.',
            link: '/tools/landing-page-estimator',
            affiliateText: 'Optimize landing pages with Unbounce → Try free',
            affiliateUrl: affiliateData.partners.unbounce.url,
          },
          {
            icon: '🔧',
            text: 'Lower CPC by improving ad quality score and refining keyword targeting.',
            affiliateText: 'Analyze competitor CPC with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '⏸️', text: 'Pause broad-match keywords and low-performing ad groups to reduce wasted spend.' },
        ],
      };
    }
    if (m.cpa > avgCPA) {
      return {
        status: 'warning',
        title: `CPA of ${formatCurrency(m.cpa)} is above the industry average of ${formatCurrency(avgCPA)}. Room for improvement.`,
        actions: [
          {
            icon: '📈',
            text: 'Test different ad creatives to improve CTR and lower effective CPC.',
            link: '/tools/ab-test-calculator',
            affiliateText: 'Track ad performance with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          {
            icon: '🎯',
            text: 'Add retargeting campaigns to convert warm audiences at lower CPA.',
            link: '/tools/ad-budget-planner',
          },
        ],
      };
    }
    if (m.cpa > avgCPA * 0.5) {
      return {
        status: 'good',
        title: `CPA of ${formatCurrency(m.cpa)} is below the industry average. Solid acquisition efficiency.`,
        actions: [
          {
            icon: '📊',
            text: 'Consider scaling budget while monitoring CPA for diminishing returns.',
            link: '/tools/ad-budget-planner',
            affiliateText: 'Plan scaling strategy with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          {
            icon: '🧪',
            text: 'A/B test landing pages to push CPA even lower.',
            link: '/tools/ab-test-calculator',
          },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `CPA of ${formatCurrency(m.cpa)} is exceptional — well below industry norms.`,
      actions: [
        {
          icon: '🚀',
          text: 'Scale aggressively — increase budget and expand to new channels.',
          link: '/tools/ad-budget-planner',
          affiliateText: 'Find new channels with Semrush → Try free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Test new platforms to diversify traffic while maintaining low CPA.' },
        {
          icon: '📧',
          text: 'Maximize LTV with email sequences to compound your low-CPA advantage.',
          link: '/tools/email-roi-calculator',
        },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">CPC/CPM/CPA Converter</h1>
        <p className="text-label max-w-2xl">
          This CPC/CPM/CPA Converter lets you instantly convert between ad pricing models and compare
          your costs against platform benchmarks. Drag sliders to simulate different traffic scenarios,
          see how you stack up against industry averages, and share your analysis with your team — all
          in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ============ INPUT PANEL ============ */}
        <div className="bg-surface rounded-xl border border-surface-lighter p-6">
          {/* Scenario tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-surface-lighter pb-3">
            {scenarios.map(s => (
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
            label="Impressions"
            value={inputs.impressions}
            min={1000}
            max={10000000}
            step={1000}
            onChange={(v) => update('impressions', v)}
            benchmarkChips={[
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
              { label: '500K', value: 500000 },
              { label: '1M', value: 1000000 },
            ]}
          />
          <ScenarioSlider
            label="Clicks"
            value={inputs.clicks}
            min={1}
            max={100000}
            step={1}
            onChange={(v) => update('clicks', v)}
          />
          <ScenarioSlider
            label="Ad Spend"
            value={inputs.adSpend}
            min={100}
            max={100000}
            step={100}
            prefix="$"
            onChange={(v) => update('adSpend', v)}
            benchmarkChips={[
              { label: 'SMB $2k', value: 2000 },
              { label: 'Mid $5k', value: 5000 },
              { label: 'Growth $15k', value: 15000 },
            ]}
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
                label="Conversions"
                value={inputs.conversions}
                min={1}
                max={10000}
                step={1}
                onChange={(v) => update('conversions', v)}
              />
              <ScenarioSlider
                label="Avg Order Value"
                value={inputs.avgOrderValue}
                min={1}
                max={1000}
                step={1}
                prefix="$"
                onChange={(v) => update('avgOrderValue', v)}
              />
            </div>
          )}

          {/* Derived Rates */}
          <div className="mt-6 pt-4 border-t border-surface-lighter">
            <h3 className="text-sm font-medium text-label mb-3">Derived Rates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-muted">CTR</p>
                <p className="text-sm font-mono text-foreground">{formatPercent(m.ctr)}</p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-muted">Conversion Rate</p>
                <p className="text-sm font-mono text-foreground">{formatPercent(m.conversionRate)}</p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-muted">Est. Revenue</p>
                <p className="text-sm font-mono text-foreground">{formatCurrency(m.revenue)}</p>
              </div>
              <div className="bg-surface-light rounded-lg p-3">
                <p className="text-xs text-muted">ROAS</p>
                <p className="text-sm font-mono text-foreground">{m.roas.toFixed(2)}x</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards — show comparison if multiple scenarios */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="CPC"
                value={formatCurrency(m.cpc)}
                subtitle={`${formatCurrency(benchmarks.advertising.google_ads.avg_cpc)} avg`}
                color={m.cpc <= benchmarks.advertising.google_ads.avg_cpc ? 'green' : m.cpc <= benchmarks.advertising.google_ads.avg_cpc * 1.5 ? 'amber' : 'red'}
              />
              <KPICard
                title="CPM"
                value={formatCurrency(m.cpm)}
                subtitle={`${formatCurrency(benchmarks.advertising.google_ads.avg_cpm)} avg`}
                color={m.cpm <= benchmarks.advertising.google_ads.avg_cpm ? 'green' : m.cpm <= benchmarks.advertising.google_ads.avg_cpm * 2 ? 'amber' : 'red'}
              />
              <KPICard
                title="CPA"
                value={formatCurrency(m.cpa)}
                subtitle={`${formatCurrency(benchmarks.advertising.google_ads.avg_cpa)} avg`}
                color={m.cpa <= benchmarks.advertising.google_ads.avg_cpa ? 'green' : m.cpa <= benchmarks.advertising.google_ads.avg_cpa * 1.5 ? 'amber' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">CPC</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.cpc)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">CPM</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.cpm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">CPA</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.cpa <= benchmarks.advertising.google_ads.avg_cpa ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(s.metrics.cpa)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="cpc-cpm-cpa-converter" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Your Costs vs. Platform Averages</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your CPC vs. Google Ads Average"
            value={m.cpc}
            benchmark={benchmarks.advertising.google_ads.avg_cpc}
            min={0}
            max={10}
            suffix="$"
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Analyze competitor CPC"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="cpc-cpm-cpa-converter" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target CPA Mode — How to reach your CPA goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target CPA</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={targetCPA}
                onChange={(e) => setTargetCPA(parseFloat(e.target.value) || 0)}
                className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}
              >
                {i === 0 && <span className="text-xs text-accent font-medium">Smallest change needed</span>}
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
            Close target CPA mode
          </button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={{
          impressions: 'Impressions',
          clicks: 'Clicks',
          conversions: 'Conversions',
          adSpend: 'Ad Spend',
          avgOrderValue: 'Avg Order Value',
        }}
        calculateFn={calcProfit}
        resultLabel="net profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding CPC, CPM, and CPA: The Three Pillars of Ad Cost Measurement</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            If you run paid advertising on any platform — Google Ads, Facebook, Instagram, LinkedIn, or TikTok —
            you are constantly dealing with three fundamental cost metrics: CPC (Cost Per Click), CPM (Cost Per
            Mille, or cost per 1,000 impressions), and CPA (Cost Per Acquisition). Each metric tells a different
            story about your campaign performance, and understanding how they relate to each other is critical for
            optimizing your ad spend.
          </p>
          <p>
            CPC measures how much you pay each time a user clicks on your ad. It is the most common pricing model
            for search advertising and is directly tied to the competitiveness of your keywords, the quality of
            your ads, and your bidding strategy. A lower CPC means you are getting more clicks for the same budget,
            but CPC alone does not tell you whether those clicks are converting into customers.
          </p>
          <p>
            CPM measures the cost of 1,000 ad impressions. It is the standard metric for display advertising,
            video ads, and brand awareness campaigns. CPM tells you how much it costs to get your ad in front of
            people. A $5 CPM means you pay $5 for every 1,000 times your ad is shown. CPM is influenced by
            audience targeting specificity, ad placement, seasonality, and competition for the same audience.
          </p>
          <p>
            CPA is arguably the most important metric for performance marketers. It measures the total cost to
            acquire a single customer or conversion. CPA encompasses everything — your ad spend, click costs,
            and conversion efficiency. If your CPA is $50, it means you spend $50 in advertising for every new
            customer you acquire.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How CPC, CPM, and CPA Are Connected</h3>
          <p>
            These three metrics are mathematically linked through your Click-Through Rate (CTR) and Conversion
            Rate. The relationship is: CPA = CPC / Conversion Rate, and CPM = CPC x CTR x 1,000 (since
            CPM = Ad Spend / Impressions x 1,000 and CPC = Ad Spend / Clicks). This means improving any one
            metric has a cascading effect. If you lower your CPC by 20%, your CPA drops by 20% assuming the same
            conversion rate. If you double your conversion rate, your CPA is cut in half.
          </p>
          <p>
            This is exactly why this converter exists. Rather than doing mental math or using a spreadsheet, you
            can plug in your real campaign numbers and instantly see how all three metrics interact. Drag the
            sliders to simulate improvements — what happens to your CPA if you get 500 more clicks? What if
            your conversion rate improves by 1%?
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Platform Benchmarks and What They Mean</h3>
          <p>
            Ad costs vary dramatically across platforms. Google Ads has an average CPC of $2.69, which reflects
            high purchase intent — people searching on Google are actively looking for solutions. Facebook Ads
            averages $1.72 CPC with a higher CPM of $7.19, because its targeting is interest-based rather than
            intent-based. LinkedIn Ads is the most expensive at $5.26 CPC, justified by access to professional
            decision-makers with higher purchasing power.
          </p>
          <p>
            The bar chart above compares your actual metrics against all five major platforms. This comparison
            helps you understand whether your costs are competitive and whether you might benefit from testing
            different channels. If your CPC on Google is well above average, it might be worth testing Facebook
            or TikTok where click costs are typically lower. For a deeper look at how your costs compare, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s competitive analysis tools let you compare your ad costs against any competitor in real time</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing Your Ad Costs</h3>
          <p>
            The most effective way to improve your advertising efficiency depends on which metric is your
            weakest point. If your CPC is high, focus on improving ad relevance, quality score, and keyword
            targeting. If your CPM is high but CPC is reasonable, your CTR is doing its job — the audience is
            just expensive to reach. If your CPA is high despite reasonable CPC, the problem is your conversion
            rate, which means your landing page, offer, or audience targeting needs work.
          </p>
          <p>
            Use the Risk Radar below your results to see which input variable has the biggest impact on your
            bottom line. This tells you exactly where to focus your optimization efforts for maximum return. To identify which keywords are driving up your CPC and find cheaper alternatives, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s keyword and ad research tools</a>.
            The reverse goal mode (click the CPA card) shows you multiple paths to reach your target CPA,
            ranked by the smallest change required.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="cpc-cpm-cpa-converter" />
      <PreRelatedCTA toolSlug="cpc-cpm-cpa-converter" />
      {/* Related Tools */}
      <RelatedTools currentSlug="cpc-cpm-cpa-converter" />
    </div>
  );
}
