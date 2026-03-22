'use client';

import { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
import { formatCurrency, formatNumber, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  currentDA: 25,
  targetDA: 45,
  monthlyLinkBuildingBudget: 2000,
  avgBacklinkCost: 350,
  currentOrganicTraffic: 3000,
  avgTrafficValuePerVisit: 0.75,
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
    question: 'What is Domain Authority and why does it matter?',
    answer: 'Domain Authority (DA) is a search engine ranking score developed by Moz that predicts how likely a website is to rank in search engine result pages. It ranges from 1 to 100, with higher scores corresponding to greater ranking ability. While DA is not a direct Google ranking factor, it strongly correlates with organic search performance because it measures the quality and quantity of backlinks pointing to your domain \u2014 which is a core ranking signal.',
  },
  {
    question: 'How long does it take to increase Domain Authority?',
    answer: 'Increasing DA is a gradual process that typically takes 3\u201312 months depending on your starting point and investment level. Each quality backlink contributes approximately 0.2\u20130.5 DA points on average. Moving from DA 20 to DA 40 is significantly easier than moving from DA 60 to DA 80, as the scale is logarithmic. Consistent, sustained link building produces the best results.',
  },
  {
    question: 'What is a good Domain Authority score?',
    answer: 'DA scores are relative to your competitive landscape. For new websites, DA 10\u201320 is typical. Established small businesses usually fall in the 20\u201340 range. Well-known brands and media sites typically have DA 40\u201370. Only major global brands and top publications reach DA 80+. The most important comparison is against your direct competitors rather than an absolute benchmark.',
  },
  {
    question: 'How much should I spend on link building?',
    answer: 'Link building budgets vary widely by industry and competition level. Quality backlinks typically cost $200\u2013$500 each through outreach campaigns, while premium placements on high-DA sites can cost $1,000+. Most SEO agencies recommend allocating 30\u201350% of your total SEO budget to link building. The key is focusing on quality over quantity \u2014 a single high-authority link can be worth more than dozens of low-quality ones.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const daGap = inp.targetDA - inp.currentDA;
  const linksPerMonth = inp.avgBacklinkCost > 0 ? inp.monthlyLinkBuildingBudget / inp.avgBacklinkCost : 0;
  const daPointsPerMonth = linksPerMonth * 0.3;
  const estimatedMonthsToTarget = daGap > 0 && daPointsPerMonth > 0 ? Math.ceil(daGap / daPointsPerMonth) : 0;
  const trafficMultiplier = 1 + (daGap * 0.05);
  const projectedTraffic = inp.currentOrganicTraffic * trafficMultiplier;
  const trafficGain = projectedTraffic - inp.currentOrganicTraffic;
  const monthlyValueGain = trafficGain * inp.avgTrafficValuePerVisit;
  const totalInvestment = inp.monthlyLinkBuildingBudget * estimatedMonthsToTarget;
  const roi = totalInvestment > 0 ? ((monthlyValueGain * 12 - totalInvestment) / totalInvestment) * 100 : 0;

  // Build monthly projection arrays
  const months: number[] = [];
  const daOverTime: number[] = [];
  const trafficOverTime: number[] = [];
  const maxMonths = Math.max(estimatedMonthsToTarget, 12);

  for (let n = 1; n <= maxMonths; n++) {
    months.push(n);
    const currentDAAtMonth = Math.min(inp.currentDA + (daPointsPerMonth * n), inp.targetDA);
    daOverTime.push(Math.round(currentDAAtMonth * 10) / 10);
    const daGainSoFar = currentDAAtMonth - inp.currentDA;
    const trafficMult = 1 + (daGainSoFar * 0.05);
    trafficOverTime.push(Math.round(inp.currentOrganicTraffic * trafficMult));
  }

  return {
    daGap,
    linksPerMonth,
    estimatedMonthsToTarget,
    trafficMultiplier,
    projectedTraffic,
    trafficGain,
    monthlyValueGain,
    totalInvestment,
    roi,
    months,
    daOverTime,
    trafficOverTime,
  };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function DAImpactCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(5000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('da-impact-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('da-impact-calculator', inputs); }, [inputs]);

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
    const daGap = (inp.targetDA || 0) - (inp.currentDA || 0);
    const trafficGain = (inp.currentOrganicTraffic || 0) * (daGap * 0.05);
    const monthlyValue = trafficGain * (inp.avgTrafficValuePerVisit || 0);
    return monthlyValue - (inp.monthlyLinkBuildingBudget || 0);
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results: { label: string; description: string; change: number }[] = [];
    // Path 1: Increase budget
    const neededMonthlyValue = goalRevenue / 12;
    const currentMonthlyValue = m.monthlyValueGain;
    const multiplier = currentMonthlyValue > 0 ? neededMonthlyValue / currentMonthlyValue : 1;
    const neededBudget = Math.ceil(inputs.monthlyLinkBuildingBudget * multiplier);
    results.push({
      label: 'Increase Link Building Budget',
      description: `Budget to ${formatCurrency(neededBudget)}/mo`,
      change: inputs.monthlyLinkBuildingBudget > 0 ? ((neededBudget - inputs.monthlyLinkBuildingBudget) / inputs.monthlyLinkBuildingBudget) * 100 : 0,
    });
    // Path 2: Higher target DA
    const neededTrafficGain = inputs.avgTrafficValuePerVisit > 0 ? neededMonthlyValue / inputs.avgTrafficValuePerVisit : 0;
    const neededMultiplier = inputs.currentOrganicTraffic > 0 ? neededTrafficGain / inputs.currentOrganicTraffic : 0;
    const neededDAGap = neededMultiplier / 0.05;
    const neededTargetDA = Math.ceil(inputs.currentDA + neededDAGap);
    results.push({
      label: 'Set Higher DA Target',
      description: `Target DA to ${neededTargetDA}`,
      change: inputs.targetDA > 0 ? ((neededTargetDA - inputs.targetDA) / inputs.targetDA) * 100 : 0,
    });
    // Path 3: Increase traffic value
    const neededValuePerVisit = m.trafficGain > 0 ? neededMonthlyValue / m.trafficGain : 0;
    results.push({
      label: 'Increase Traffic Value',
      description: `Value per visit to ${formatCurrency(neededValuePerVisit, 2)}`,
      change: inputs.avgTrafficValuePerVisit > 0 ? ((neededValuePerVisit - inputs.avgTrafficValuePerVisit) / inputs.avgTrafficValuePerVisit) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: m.months.map(n => `Mo ${n}`),
    datasets: allMetrics.flatMap((s, idx) => [
      {
        label: `${s.label} \u2014 Domain Authority`,
        data: s.metrics.daOverTime,
        borderColor: scenarioColors[idx],
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 2,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: `${s.label} \u2014 Projected Traffic`,
        data: s.metrics.trafficOverTime,
        borderColor: scenarioColors[idx],
        backgroundColor: `${scenarioColors[idx]}20`,
        fill: true,
        pointRadius: 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ]),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
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
            if (ctx.dataset.yAxisID === 'y') return `${ctx.dataset.label}: DA ${v.toFixed(1)}`;
            return `${ctx.dataset.label}: ${formatNumber(v)} visits`;
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8' },
        title: { display: true, text: 'Domain Authority', color: '#94A3B8' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => formatNumber(Number(v)),
        },
        title: { display: true, text: 'Organic Traffic', color: '#94A3B8' },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.roi < 0) {
      return {
        status: 'danger',
        title: `Projected ROI of ${m.roi.toFixed(0)}% \u2014 your link building investment may not pay off at current rates.`,
        actions: [
          { icon: '\uD83D\uDD0D', text: 'Audit your backlink strategy \u2014 focus on quality over quantity. A few high-DA links outperform many low-quality ones.', affiliateText: 'Find link opportunities with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCB0', text: 'Reduce average backlink cost by focusing on digital PR, guest posting, and relationship-based outreach.' },
          { icon: '\uD83D\uDCC8', text: 'Improve your traffic monetization \u2014 higher conversion rates amplify the value of every DA point gained.' },
        ],
      };
    }
    if (m.roi < 100) {
      return {
        status: 'warning',
        title: `ROI of ${m.roi.toFixed(0)}% is positive but there is room to improve your link building efficiency.`,
        actions: [
          { icon: '\uD83C\uDFAF', text: 'Prioritize backlinks from high-DA, topically relevant sites \u2014 these have the strongest impact on rankings.' },
          { icon: '\uD83D\uDD17', text: 'Diversify your link building tactics \u2014 combine guest posts, resource pages, broken link building, and digital PR.', affiliateText: 'Analyze competitor backlinks with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCCA', text: 'Track link acquisition rate monthly and adjust strategy based on what is driving the most DA growth.', link: '/tools/backlink-value-calculator' },
        ],
      };
    }
    if (m.roi < 300) {
      return {
        status: 'good',
        title: `ROI of ${m.roi.toFixed(0)}% \u2014 your link building program is generating solid returns.`,
        actions: [
          { icon: '\uD83D\uDCC8', text: 'Scale your link building budget \u2014 at this ROI, additional investment should deliver proportional returns.' },
          { icon: '\uD83C\uDFC6', text: 'Target competitor backlinks \u2014 find where competing sites get their best links and replicate their strategy.', affiliateText: 'Spy on competitor links with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDD04', text: 'Build linkable assets like research reports, tools, and data studies that earn links passively over time.' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `ROI of ${m.roi.toFixed(0)}% \u2014 your domain authority strategy is delivering exceptional returns.`,
      actions: [
        { icon: '\uD83D\uDE80', text: 'Aggressively scale investment \u2014 every dollar in link building is generating outstanding returns at this rate.', affiliateText: 'Scale link building with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83C\uDF10', text: 'Expand into new content verticals to capture additional organic traffic as your domain authority grows.' },
        { icon: '\uD83D\uDCB0', text: 'Improve conversion rate optimization to maximize the revenue from your growing organic traffic.', link: '/tools/landing-page-estimator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Domain Authority Impact Calculator</h1>
        <p className="text-label max-w-2xl">
          Model how improving your domain authority impacts organic traffic and revenue.
          Set your current DA, target DA, and link building budget to project growth
          timelines, traffic gains, and ROI &mdash; all in real time.
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
            <button
              onClick={resetDefaults}
              className="text-xs text-muted hover:text-label transition-colors ml-auto"
            >
              Reset
            </button>
          </div>

          <ScenarioSlider
            label="Current Domain Authority"
            value={inputs.currentDA}
            min={1}
            max={90}
            step={1}
            onChange={(v) => update('currentDA', v)}
            benchmarkChips={[
              { label: 'New Site 10', value: 10 },
              { label: 'Small Biz 25', value: 25 },
              { label: 'Established 40', value: 40 },
              { label: 'Authority 60', value: 60 },
            ]}
          />
          <ScenarioSlider
            label="Target Domain Authority"
            value={inputs.targetDA}
            min={1}
            max={100}
            step={1}
            benchmark={benchmarks.seo.avg_da_established}
            benchmarkLabel="Established site avg"
            onChange={(v) => update('targetDA', v)}
          />
          <ScenarioSlider
            label="Monthly Link Building Budget"
            value={inputs.monthlyLinkBuildingBudget}
            min={0}
            max={20000}
            step={100}
            prefix="$"
            onChange={(v) => update('monthlyLinkBuildingBudget', v)}
            benchmarkChips={[
              { label: '$1K', value: 1000 },
              { label: '$2K', value: 2000 },
              { label: '$5K', value: 5000 },
              { label: '$10K', value: 10000 },
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
                label="Average Backlink Cost"
                value={inputs.avgBacklinkCost}
                min={50}
                max={2000}
                step={10}
                prefix="$"
                benchmark={benchmarks.seo.avg_backlink_cost}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('avgBacklinkCost', v)}
              />
              <ScenarioSlider
                label="Current Organic Traffic"
                value={inputs.currentOrganicTraffic}
                min={0}
                max={500000}
                step={100}
                onChange={(v) => update('currentOrganicTraffic', v)}
                benchmarkChips={[
                  { label: '1K', value: 1000 },
                  { label: '5K', value: 5000 },
                  { label: '10K', value: 10000 },
                  { label: '50K', value: 50000 },
                ]}
              />
              <ScenarioSlider
                label="Avg Traffic Value per Visit"
                value={inputs.avgTrafficValuePerVisit}
                min={0.01}
                max={10}
                step={0.01}
                prefix="$"
                benchmark={benchmarks.seo.avg_organic_traffic_value_per_visit}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('avgTrafficValuePerVisit', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Months to Target DA"
                value={m.estimatedMonthsToTarget > 0 ? `${m.estimatedMonthsToTarget} mo` : 'N/A'}
                subtitle={m.linksPerMonth > 0 ? `${m.linksPerMonth.toFixed(1)} links/mo` : 'No budget set'}
                color={m.estimatedMonthsToTarget > 0 && m.estimatedMonthsToTarget <= 6 ? 'green' : m.estimatedMonthsToTarget <= 12 ? 'amber' : 'red'}
              />
              <KPICard
                title="Monthly Traffic Gain"
                value={formatNumber(Math.round(m.trafficGain))}
                subtitle={`${formatCurrency(m.monthlyValueGain)}/mo value`}
                color={m.trafficGain > 0 ? 'green' : 'blue'}
              />
              <KPICard
                title="ROI"
                value={`${m.roi.toFixed(0)}%`}
                subtitle={m.totalInvestment > 0 ? `${formatCurrency(m.totalInvestment)} total investment` : 'No investment'}
                color={m.roi >= 300 ? 'green' : m.roi >= 100 ? 'amber' : m.roi > 0 ? 'blue' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">Months to Target</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.metrics.estimatedMonthsToTarget > 0 ? `${s.metrics.estimatedMonthsToTarget} mo` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Traffic Gain</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatNumber(Math.round(s.metrics.trafficGain))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">ROI</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.metrics.roi.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="da-impact-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">DA Growth &amp; Traffic Projection</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Current DA vs. Established Site Average"
            value={inputs.currentDA}
            benchmark={benchmarks.seo.avg_da_established}
            min={0}
            max={100}
            suffix=""
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Find link opportunities"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="da-impact-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Revenue Goal &mdash; How to reach your annual traffic value target
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Annual Traffic Value</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalRevenue}
                onChange={(e) => setGoalRevenue(parseFloat(e.target.value) || 0)}
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

      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      <RiskRadar
        inputs={inputs}
        labels={{
          currentDA: 'Current DA',
          targetDA: 'Target DA',
          monthlyLinkBuildingBudget: 'Link Budget',
          avgBacklinkCost: 'Backlink Cost',
          currentOrganicTraffic: 'Current Traffic',
          avgTrafficValuePerVisit: 'Value/Visit',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly value gain"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Domain Authority and Its Impact</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Domain Authority is one of the most widely used metrics for predicting a website&apos;s ability
            to rank in search engines. While not a direct Google ranking factor, DA strongly correlates
            with organic search performance because it measures the strength and quality of a site&apos;s
            backlink profile &mdash; which is one of Google&apos;s core ranking signals. Improving your DA
            through strategic link building is one of the most effective ways to increase organic traffic
            and reduce dependence on paid advertising.
          </p>
          <p>
            This calculator models the relationship between domain authority improvement, organic traffic
            growth, and the financial value of that traffic. By inputting your current DA, target DA,
            and link building investment, you can project how long it will take to reach your goal and
            what the return on your investment will be.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How DA Impacts Organic Traffic</h3>
          <p>
            Research shows that each point of domain authority improvement correlates with approximately
            a 5% increase in organic traffic. This relationship is not perfectly linear &mdash; the impact
            is typically stronger at lower DA levels and moderates as you approach higher scores. However,
            even small DA improvements can drive significant traffic gains, especially for sites with
            substantial existing content that is held back by insufficient authority.
          </p>
          <p>
            The key to efficient DA growth is acquiring quality backlinks from relevant, authoritative
            sources. Each quality backlink typically contributes approximately 0.2&ndash;0.5 DA points,
            depending on the linking domain&apos;s own authority and relevance. To identify the highest-impact link opportunities in your niche, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s backlink analytics reveal where competitors earn their most valuable links</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Building a Link Strategy That Drives DA Growth</h3>
          <p>
            The most effective link building strategies combine multiple tactics: guest posting on relevant
            industry sites, creating linkable assets like research studies and tools, digital PR campaigns
            that earn editorial coverage, and broken link building. The best approach depends on your
            industry, budget, and existing content assets. Consistency matters more than volume &mdash;
            sustained link acquisition over months produces better results than sporadic bursts.
          </p>
          <p>
            Use the scenario comparison feature to model different budget levels and see how they affect
            your timeline. A higher monthly budget means more links per month, faster DA growth, and
            quicker time to ROI. For a comprehensive view of your backlink profile and competitor link gaps, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s backlink gap tool to find untapped link opportunities</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing the Value of DA Improvements</h3>
          <p>
            Domain authority improvement only delivers ROI if the additional traffic converts. Pair your
            link building investment with conversion rate optimization to ensure you capture maximum value
            from every new visitor. Strong landing pages, compelling calls to action, and a clear user
            journey multiply the financial impact of every DA point you gain. Use the Risk Radar above
            to identify which variable has the greatest impact on your projected returns.
          </p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="da-impact-calculator" />
      <PreRelatedCTA toolSlug="da-impact-calculator" />
      <RelatedTools currentSlug="da-impact-calculator" />
    </div>
  );
}
