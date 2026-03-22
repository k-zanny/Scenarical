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
  referringDomainDA: 50,
  linkRelevance: 70,
  isDoFollow: 1,
  referralTraffic: 100,
  avgTrafficValue: 0.75,
  linkPlacement: 50,
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
    question: 'What makes a backlink valuable?',
    answer: 'A valuable backlink comes from a high-authority, topically relevant domain; is placed within editorial content (not sidebars or footers); uses a dofollow attribute; and drives real referral traffic. The most valuable backlinks are earned naturally — when other sites link to your content because it is genuinely useful, unique, or newsworthy. Domain authority of the linking site, relevance to your niche, and link placement are the three biggest factors in backlink value.',
  },
  {
    question: 'How much should I pay for a backlink?',
    answer: 'A fair price for a backlink depends on the linking domain\'s authority, relevance, traffic, and placement. The industry average cost is around $350, but quality editorial links from high-DA sites can cost $500-$2,000+. As a rule of thumb, you should pay no more than 6 months of the link\'s estimated monthly value. This calculator helps you determine the fair price based on the specific attributes of each link opportunity.',
  },
  {
    question: 'Do nofollow links have any SEO value?',
    answer: 'Yes, but significantly less than dofollow links. Google treats nofollow as a "hint" rather than a directive, meaning some link equity may still pass. Nofollow links also drive referral traffic, build brand awareness, and create a natural-looking link profile. This calculator weights nofollow links at 30% of the SEO value of dofollow links, which aligns with industry consensus on their relative impact.',
  },
  {
    question: 'How do I evaluate backlink quality at scale?',
    answer: 'Use a combination of metrics: domain authority of the linking site, topical relevance to your niche, link placement (in-content vs. sidebar vs. footer), follow status, and actual referral traffic. Tools like Semrush and Ahrefs provide backlink databases that let you audit links at scale. Focus on quality over quantity — one link from a DA 70 relevant site is worth more than 50 links from low-quality directories.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const daFactor = inp.referringDomainDA / 100;
  const relevanceFactor = inp.linkRelevance / 100;
  const followFactor = inp.isDoFollow ? 1.0 : 0.3;
  const placementFactor = inp.linkPlacement / 100;
  const qualityScore = (daFactor * 0.4 + relevanceFactor * 0.3 + followFactor * 0.15 + placementFactor * 0.15) * 100;
  const monthlyReferralValue = inp.referralTraffic * inp.avgTrafficValue;
  const seoValue = qualityScore * 5;
  const totalMonthlyValue = monthlyReferralValue + seoValue;
  const annualValue = totalMonthlyValue * 12;
  const fairPrice = annualValue * 0.5;

  return { qualityScore, monthlyReferralValue, seoValue, totalMonthlyValue, annualValue, fairPrice };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function BacklinkValueCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalValue, setGoalValue] = useState(500);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('backlink-value-calculator');
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
    saveToLocalStorage('backlink-value-calculator', inputs);
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
    const daF = (inp.referringDomainDA || 0) / 100;
    const relF = (inp.linkRelevance || 0) / 100;
    const folF = inp.isDoFollow ? 1.0 : 0.3;
    const plaF = (inp.linkPlacement || 0) / 100;
    const qs = (daF * 0.4 + relF * 0.3 + folF * 0.15 + plaF * 0.15) * 100;
    const refVal = (inp.referralTraffic || 0) * (inp.avgTrafficValue || 0);
    const seoVal = qs * 5;
    return refVal + seoVal;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Increase referring domain DA
    const neededMonthlyValue = goalValue / 6; // fairPrice = annual * 0.5 = monthly * 12 * 0.5 = monthly * 6
    const additionalSEONeeded = Math.max(0, neededMonthlyValue - m.monthlyReferralValue);
    const neededQS = additionalSEONeeded / 5;
    const neededDA = Math.min(100, Math.ceil(neededQS / 0.4 * 100 / 100));
    results.push({
      label: 'Target Higher DA Sites',
      description: `Seek links from DA ${neededDA}+ domains`,
      change: inputs.referringDomainDA > 0 ? ((neededDA - inputs.referringDomainDA) / inputs.referringDomainDA) * 100 : 0,
    });
    // Path 2: Increase referral traffic
    const neededTraffic = inputs.avgTrafficValue > 0 ? Math.ceil((neededMonthlyValue - m.seoValue) / inputs.avgTrafficValue) : 0;
    results.push({
      label: 'Seek Higher Traffic Pages',
      description: `Target pages sending ${formatNumber(Math.max(0, neededTraffic))}+ referral visits/mo`,
      change: inputs.referralTraffic > 0 ? ((Math.max(0, neededTraffic) - inputs.referralTraffic) / inputs.referralTraffic) * 100 : 0,
    });
    // Path 3: Improve relevance
    results.push({
      label: 'Improve Link Relevance',
      description: 'Focus on topically relevant, in-content editorial links',
      change: inputs.linkRelevance < 100 ? ((100 - inputs.linkRelevance) / inputs.linkRelevance) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — value breakdown
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Referral Traffic Value', 'SEO Authority Value'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.monthlyReferralValue, s.metrics.seoValue],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}80`,
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
            return `${ctx.dataset.label}: ${formatCurrency(v)}/mo`;
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
    if (m.qualityScore < 25) {
      return {
        status: 'danger',
        title: `Quality score of ${m.qualityScore.toFixed(0)} — this is a low-value backlink. Avoid overpaying.`,
        actions: [
          {
            icon: '🚫',
            text: 'Do not pay for this link. Low-quality backlinks can hurt your rankings and waste budget.',
            affiliateText: 'Find quality link opportunities with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🔍', text: 'Look for links from more relevant, higher-authority domains in your niche.' },
          { icon: '📝', text: 'Invest in creating linkable content assets that attract high-quality links naturally.' },
        ],
      };
    }
    if (m.qualityScore < 50) {
      return {
        status: 'warning',
        title: `Quality score of ${m.qualityScore.toFixed(0)} — below average. Negotiate a lower price.`,
        actions: [
          { icon: '💰', text: `Fair price is ${formatCurrency(m.fairPrice)} — do not pay more than this for this link.` },
          {
            icon: '🔗',
            text: 'Request in-content placement and dofollow status to maximize the link\'s value.',
            affiliateText: 'Analyze competitor backlinks with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📊', text: 'Compare this opportunity against other link prospects — prioritize higher-quality options.', link: '/tools/da-impact-calculator' },
        ],
      };
    }
    if (m.qualityScore < 75) {
      return {
        status: 'good',
        title: `Quality score of ${m.qualityScore.toFixed(0)} — a solid backlink opportunity worth pursuing.`,
        actions: [
          { icon: '✅', text: `Fair price of ${formatCurrency(m.fairPrice)} represents good value. Proceed with outreach.` },
          {
            icon: '📈',
            text: 'Negotiate for contextual, in-content placement to maximize SEO value transfer.',
            affiliateText: 'Track your backlink growth with Semrush → Try Free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🔄', text: 'Build a relationship with this site for future link opportunities and content partnerships.', link: '/tools/seo-roi-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Quality score of ${m.qualityScore.toFixed(0)} — premium backlink. This link is highly valuable.`,
      actions: [
        {
          icon: '🏆',
          text: `Worth up to ${formatCurrency(m.fairPrice)}. This link will meaningfully boost your authority.`,
          affiliateText: 'Monitor your link profile with Semrush → Try Free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🤝', text: 'Prioritize this link acquisition — high-DA relevant links are rare and extremely impactful.' },
        { icon: '📧', text: 'Invest in personalized outreach and offer genuine value to increase your chances of earning this link.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Backlink Value Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate the true value of any backlink based on domain authority, relevance,
          link placement, and referral traffic. Determine fair pricing for link-building
          opportunities and compare link quality across scenarios.
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
            label="Referring Domain Authority"
            value={inputs.referringDomainDA}
            min={1}
            max={100}
            step={1}
            benchmark={benchmarks.seo.avg_da_established}
            benchmarkLabel="Established site avg"
            onChange={(v) => update('referringDomainDA', v)}
            benchmarkChips={[
              { label: 'Low 15', value: 15 },
              { label: 'Med 40', value: 40 },
              { label: 'High 70', value: 70 },
              { label: 'Elite 90', value: 90 },
            ]}
          />
          <ScenarioSlider
            label="Link Relevance (0-100)"
            value={inputs.linkRelevance}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update('linkRelevance', v)}
            benchmarkChips={[
              { label: 'Off-topic 10', value: 10 },
              { label: 'Related 50', value: 50 },
              { label: 'Relevant 75', value: 75 },
              { label: 'Exact match 100', value: 100 },
            ]}
          />
          <ScenarioSlider
            label="DoFollow Link"
            value={inputs.isDoFollow}
            min={0}
            max={1}
            step={1}
            onChange={(v) => update('isDoFollow', v)}
            benchmarkChips={[
              { label: 'NoFollow', value: 0 },
              { label: 'DoFollow', value: 1 },
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
                label="Monthly Referral Traffic"
                value={inputs.referralTraffic}
                min={0}
                max={10000}
                step={10}
                onChange={(v) => update('referralTraffic', v)}
                benchmarkChips={[
                  { label: 'Low 20', value: 20 },
                  { label: 'Med 100', value: 100 },
                  { label: 'High 500', value: 500 },
                  { label: 'Premium 2K', value: 2000 },
                ]}
              />
              <ScenarioSlider
                label="Avg Traffic Value per Visit"
                value={inputs.avgTrafficValue}
                min={0.01}
                max={10}
                step={0.01}
                prefix="$"
                benchmark={benchmarks.seo.avg_organic_traffic_value_per_visit}
                benchmarkLabel="Avg organic visit value"
                onChange={(v) => update('avgTrafficValue', v)}
              />
              <ScenarioSlider
                label="Link Placement Quality"
                value={inputs.linkPlacement}
                min={0}
                max={100}
                step={10}
                onChange={(v) => update('linkPlacement', v)}
                benchmarkChips={[
                  { label: 'Footer 10', value: 10 },
                  { label: 'Sidebar 30', value: 30 },
                  { label: 'In-content 100', value: 100 },
                ]}
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
                title="Quality Score"
                value={m.qualityScore.toFixed(0)}
                subtitle={m.qualityScore >= 75 ? 'Premium link' : m.qualityScore >= 50 ? 'Above average' : m.qualityScore >= 25 ? 'Below average' : 'Low quality'}
                color={m.qualityScore >= 75 ? 'green' : m.qualityScore >= 50 ? 'amber' : m.qualityScore >= 25 ? 'blue' : 'red'}
              />
              <KPICard
                title="Monthly Value"
                value={formatCurrency(m.totalMonthlyValue)}
                subtitle={`${formatCurrency(m.monthlyReferralValue)} referral + ${formatCurrency(m.seoValue)} SEO`}
                color="blue"
              />
              <KPICard
                title="Fair Price to Pay"
                value={formatCurrency(m.fairPrice)}
                subtitle={`Based on ${formatCurrency(m.annualValue)} annual value`}
                color={m.fairPrice > 0 ? 'green' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">Quality Score</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.metrics.qualityScore.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Monthly Value</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.totalMonthlyValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Fair Price</p>
                      <p className="font-mono text-lg font-bold text-success">
                        {formatCurrency(s.metrics.fairPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="backlink-value-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Value Breakdown: Referral vs SEO</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Quality Score vs Average Backlink"
            value={m.qualityScore}
            benchmark={50}
            min={0}
            max={100}
            suffix=""
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Find high-quality backlink opportunities"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="backlink-value-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Value — How to justify your link budget
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Fair Price Budget</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(parseFloat(e.target.value) || 0)}
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
          referringDomainDA: 'Domain Authority',
          linkRelevance: 'Link Relevance',
          isDoFollow: 'DoFollow Status',
          referralTraffic: 'Referral Traffic',
          avgTrafficValue: 'Traffic Value',
          linkPlacement: 'Link Placement',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly value"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Backlink Value</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Backlinks remain one of the most powerful ranking factors in SEO. But not all backlinks
            are created equal. A single link from a high-authority, topically relevant site can be
            worth more than hundreds of links from low-quality directories or unrelated domains.
            Understanding the true value of a backlink — before you invest time or money acquiring
            it — is critical to building an efficient, effective link-building strategy.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">What Determines Backlink Quality</h3>
          <p>
            Four primary factors determine a backlink&apos;s quality and value. First, the domain
            authority of the referring site — higher DA means more link equity passed to your page.
            Second, topical relevance — a link from a site in your niche carries more weight than
            one from an unrelated domain. Third, the follow status — dofollow links pass full link
            equity while nofollow links pass approximately 30% (Google treats nofollow as a hint).
            Fourth, link placement — links within editorial content are valued far more than sidebar
            or footer links. To analyze the backlink profiles of top-ranking competitors in your space, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s backlink analytics database covers over 43 trillion links</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Calculate Fair Pricing</h3>
          <p>
            The fair price for a backlink should be based on the value it delivers, not arbitrary
            pricing. This calculator estimates both the direct referral traffic value and the
            indirect SEO authority value, then recommends paying approximately 6 months of the
            link&apos;s total monthly value. The average cost of a quality backlink is around
            ${formatCurrency(benchmarks.seo.avg_backlink_cost)}, but prices vary enormously — from
            $50 for a low-DA guest post to $2,000+ for a premium editorial placement on a top-tier
            publication.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Building a High-Value Link Profile</h3>
          <p>
            The most effective link-building strategies focus on earning links rather than buying
            them. Create genuinely useful content — original research, comprehensive guides,
            interactive tools, and data-driven studies — that people naturally want to reference
            and link to. Supplement this with targeted outreach to relevant sites where your content
            adds genuine value to their audience. Quality always trumps quantity in link building:
            10 links from relevant DA 50+ sites will outperform 100 links from low-quality sources.
            For comprehensive backlink analysis and competitor link research, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s link building tools to find and prioritize the best opportunities</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="backlink-value-calculator" />
      <PreRelatedCTA toolSlug="backlink-value-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="backlink-value-calculator" />
    </div>
  );
}
