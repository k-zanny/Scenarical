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
import { formatCurrency, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  monthlySeoBudget: 3000,
  currentOrganicTraffic: 5000,
  expectedTrafficGrowth: 15,
  organicConversionRate: 2.4,
  avgConversionValue: 100,
  timeToResultsMonths: 6,
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
    question: 'How long does SEO take to show ROI?',
    answer: 'Most SEO campaigns take 4\u20136 months to produce measurable results and 6\u201312 months to show meaningful ROI. The timeline depends on your starting domain authority, keyword competitiveness, content quality, and link building effectiveness. Sites with established authority may see faster returns, while new domains typically require longer investment horizons.',
  },
  {
    question: 'What is a good ROI for SEO?',
    answer: 'A well-executed SEO campaign typically delivers 5x\u201310x ROI over 12 months, translating to 400%\u2013900% returns. SEO ROI compounds over time \u2014 unlike paid ads, earned traffic continues generating revenue long after the initial investment. Many businesses see their best returns in years 2\u20133 as compounding content and domain authority accelerate growth.',
  },
  {
    question: 'How do I calculate the value of organic traffic?',
    answer: 'The most common method is the ad-equivalent approach: multiply monthly organic visitors by the average CPC you would pay through paid search. For example, 10,000 organic visitors at $2.50 average CPC equals $25,000/month in ad-equivalent value. You can also calculate revenue-based value by multiplying traffic by conversion rate and average order value.',
  },
  {
    question: 'Should I invest in SEO or paid ads?',
    answer: 'The best strategy usually combines both channels. Paid ads deliver immediate traffic and revenue, ideal for time-sensitive campaigns. SEO builds long-term, compounding traffic without ongoing ad spend. Most businesses should use paid ads for short-term revenue while investing in SEO for sustainable growth. This calculator helps you see when SEO begins outperforming equivalent paid traffic costs.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const monthlyTrafficGain = inp.currentOrganicTraffic * (inp.expectedTrafficGrowth / 100);
  const months: number[] = [];
  const cumulativeCosts: number[] = [];
  const cumulativeRevenues: number[] = [];
  let cumCost = 0;
  let cumRevenue = 0;
  let breakEvenMonth = 0;

  for (let n = 1; n <= 12; n++) {
    const growthFactor = Math.min(n, inp.timeToResultsMonths) / inp.timeToResultsMonths;
    const newTraffic = inp.currentOrganicTraffic + (monthlyTrafficGain * growthFactor * n);
    const monthlyConversions = newTraffic * inp.organicConversionRate / 100;
    const monthlyRevenue = monthlyConversions * inp.avgConversionValue;
    cumCost += inp.monthlySeoBudget;
    cumRevenue += monthlyRevenue;
    months.push(n);
    cumulativeCosts.push(cumCost);
    cumulativeRevenues.push(cumRevenue);
    if (breakEvenMonth === 0 && cumRevenue >= cumCost) breakEvenMonth = n;
  }

  const finalMonthTraffic = inp.currentOrganicTraffic + (monthlyTrafficGain * Math.min(12, inp.timeToResultsMonths) / inp.timeToResultsMonths * 12);
  const monthlySeoRevenue = (finalMonthTraffic * inp.organicConversionRate / 100) * inp.avgConversionValue;
  const totalCost = cumulativeCosts[11] || 0;
  const totalRevenue = cumulativeRevenues[11] || 0;
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  return { monthlySeoRevenue, roi, breakEvenMonth, months, cumulativeCosts, cumulativeRevenues, totalCost, totalRevenue, finalMonthTraffic };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function SEOROICalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(50000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('seo-roi-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('seo-roi-calculator', inputs); }, [inputs]);

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
    const mtg = (inp.currentOrganicTraffic || 0) * ((inp.expectedTrafficGrowth || 0) / 100);
    const gf = Math.min(12, inp.timeToResultsMonths || 6) / (inp.timeToResultsMonths || 6);
    const ft = (inp.currentOrganicTraffic || 0) + (mtg * gf * 12);
    return ft * ((inp.organicConversionRate || 0) / 100) * (inp.avgConversionValue || 0) - (inp.monthlySeoBudget || 0);
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results: { label: string; description: string; change: number }[] = [];
    const nM = m.monthlySeoRevenue > 0 ? goalRevenue / (m.monthlySeoRevenue * 12) : 1;
    const nB = Math.ceil(inputs.monthlySeoBudget * nM);
    results.push({
      label: 'Scale SEO Budget',
      description: `Increase budget to ${formatCurrency(nB)}/mo`,
      change: inputs.monthlySeoBudget > 0 ? ((nB - inputs.monthlySeoBudget) / inputs.monthlySeoBudget) * 100 : 0,
    });
    const nConv = inputs.avgConversionValue > 0 ? goalRevenue / (12 * inputs.avgConversionValue) : 0;
    const nCR = m.finalMonthTraffic > 0 ? (nConv / m.finalMonthTraffic) * 100 : 0;
    results.push({
      label: 'Improve Conversion Rate',
      description: `Conversion rate to ${nCR.toFixed(2)}%`,
      change: inputs.organicConversionRate > 0 ? ((nCR - inputs.organicConversionRate) / inputs.organicConversionRate) * 100 : 0,
    });
    const nRev = goalRevenue / 12;
    const nT = (inputs.organicConversionRate / 100) * inputs.avgConversionValue > 0
      ? nRev / ((inputs.organicConversionRate / 100) * inputs.avgConversionValue) : 0;
    const nG = inputs.currentOrganicTraffic > 0
      ? ((nT - inputs.currentOrganicTraffic) / inputs.currentOrganicTraffic) * 100 : 0;
    results.push({
      label: 'Accelerate Traffic Growth',
      description: `Traffic growth to ${nG.toFixed(1)}%/mo`,
      change: inputs.expectedTrafficGrowth > 0 ? ((nG - inputs.expectedTrafficGrowth) / inputs.expectedTrafficGrowth) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: m.months.map(n => `Mo ${n}`),
    datasets: allMetrics.flatMap((s, idx) => [
      {
        label: `${s.label} \u2014 Cumulative Cost`,
        data: s.metrics.cumulativeCosts,
        borderColor: scenarioColors[idx],
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 2,
        tension: 0.3,
      },
      {
        label: `${s.label} \u2014 Cumulative Revenue`,
        data: s.metrics.cumulativeRevenues,
        borderColor: scenarioColors[idx],
        backgroundColor: `${scenarioColors[idx]}20`,
        fill: true,
        pointRadius: 2,
        tension: 0.3,
      },
    ]),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
            return `${ctx.dataset.label}: ${formatCurrency(v)}`;
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
          callback: (v: any) => formatCurrency(Number(v)),
        },
      },
    },
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.roi < 0) {
      return {
        status: 'danger',
        title: `Your 12-month SEO ROI is ${m.roi.toFixed(0)}% \u2014 your investment has not paid off yet.`,
        actions: [
          { icon: '\uD83D\uDD0D', text: 'Audit your keyword strategy \u2014 you may be targeting terms too competitive for your current domain authority.', affiliateText: 'Find winnable keywords with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCDD', text: 'Focus on long-tail, low-competition keywords where you can rank faster and generate early traffic.' },
          { icon: '\u23F3', text: 'Extend your time horizon \u2014 SEO is a compounding channel, and many campaigns break even between months 6-9.' },
        ],
      };
    }
    if (m.roi < 200) {
      return {
        status: 'warning',
        title: `ROI of ${m.roi.toFixed(0)}% is positive but modest. SEO is working but not yet firing on all cylinders.`,
        actions: [
          { icon: '\uD83C\uDFAF', text: 'Optimize existing content \u2014 update titles, meta descriptions, and internal links to improve rankings on pages close to page 1.' },
          { icon: '\uD83D\uDD17', text: 'Invest in strategic link building to accelerate domain authority growth and ranking velocity.', affiliateText: 'Find link opportunities with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCCA', text: 'Improve on-page conversion rates \u2014 better CTAs, landing pages, and lead magnets can dramatically increase revenue per visitor.', link: '/tools/landing-page-estimator' },
        ],
      };
    }
    if (m.roi < 500) {
      return {
        status: 'good',
        title: `ROI of ${m.roi.toFixed(0)}% \u2014 your SEO program is delivering strong returns.`,
        actions: [
          { icon: '\uD83D\uDCC8', text: 'Scale content production \u2014 at this ROI, every additional piece of content is likely profitable.' },
          { icon: '\uD83C\uDFC6', text: 'Target more competitive, higher-volume keywords now that your domain has built authority.', affiliateText: 'Discover high-value keywords with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDD04', text: 'Build content clusters and topical authority to compound rankings across related keyword groups.' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `ROI of ${m.roi.toFixed(0)}% \u2014 your SEO program is a top-tier growth engine.`,
      actions: [
        { icon: '\uD83D\uDE80', text: 'Double down on SEO budget \u2014 at this return rate, increased investment will compound your results significantly.', affiliateText: 'Scale your SEO with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83C\uDF10', text: 'Expand into international SEO or new content verticals to capture additional organic traffic.' },
        { icon: '\uD83D\uDCB0', text: 'Consider reducing paid ad spend and reallocating to SEO \u2014 your organic channel is outperforming.', link: '/tools/roas-calculator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">SEO ROI Calculator</h1>
        <p className="text-label max-w-2xl">
          Model your SEO investment over 12 months to see cumulative costs versus cumulative
          revenue. Adjust traffic growth rates, conversion rates, and budget to find your
          break-even point and project long-term returns &mdash; all in real time.
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
            label="Monthly SEO Budget"
            value={inputs.monthlySeoBudget}
            min={500}
            max={50000}
            step={100}
            prefix="$"
            onChange={(v) => update('monthlySeoBudget', v)}
            benchmarkChips={[
              { label: '$1K', value: 1000 },
              { label: '$3K', value: 3000 },
              { label: '$5K', value: 5000 },
              { label: '$10K', value: 10000 },
            ]}
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
            label="Expected Traffic Growth"
            value={inputs.expectedTrafficGrowth}
            min={1}
            max={100}
            step={1}
            suffix="%"
            onChange={(v) => update('expectedTrafficGrowth', v)}
            benchmarkChips={[
              { label: '5%', value: 5 },
              { label: '10%', value: 10 },
              { label: '15%', value: 15 },
              { label: '25%', value: 25 },
            ]}
          />

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
                label="Organic Conversion Rate"
                value={inputs.organicConversionRate}
                min={0.1}
                max={15}
                step={0.1}
                suffix="%"
                benchmark={benchmarks.seo.avg_organic_conversion_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('organicConversionRate', v)}
              />
              <ScenarioSlider
                label="Average Conversion Value"
                value={inputs.avgConversionValue}
                min={1}
                max={1000}
                step={1}
                prefix="$"
                onChange={(v) => update('avgConversionValue', v)}
                benchmarkChips={[
                  { label: 'eComm $75', value: 75 },
                  { label: 'SaaS $200', value: 200 },
                  { label: 'B2B $500', value: 500 },
                ]}
              />
              <ScenarioSlider
                label="Time to Results (Months)"
                value={inputs.timeToResultsMonths}
                min={1}
                max={12}
                step={1}
                benchmark={benchmarks.seo.avg_time_to_rank_months}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('timeToResultsMonths', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Monthly SEO Revenue"
                value={formatCurrency(m.monthlySeoRevenue)}
                subtitle="at month 12"
                color={m.monthlySeoRevenue > inputs.monthlySeoBudget ? 'green' : 'red'}
              />
              <KPICard
                title="12-Month ROI"
                value={`${m.roi.toFixed(0)}%`}
                subtitle={m.totalCost > 0 ? `${(m.roi / 100).toFixed(1)}x return` : 'No cost entered'}
                color={m.roi >= 500 ? 'green' : m.roi >= 100 ? 'amber' : m.roi > 0 ? 'blue' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Break-even Month"
                value={m.breakEvenMonth > 0 ? `Month ${m.breakEvenMonth}` : 'N/A'}
                subtitle={m.breakEvenMonth > 0 ? `${12 - m.breakEvenMonth} months of profit` : 'Not reached in 12 months'}
                color={m.breakEvenMonth > 0 && m.breakEvenMonth <= 6 ? 'green' : m.breakEvenMonth > 0 ? 'amber' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">Mo 12 Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.monthlySeoRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">12-Mo ROI</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.metrics.roi.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Break-even</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {s.metrics.breakEvenMonth > 0 ? `Month ${s.metrics.breakEvenMonth}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="seo-roi-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Cumulative Cost vs. Revenue (12 Months)</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Organic Conversion Rate vs. Industry Average"
            value={inputs.organicConversionRate}
            benchmark={benchmarks.seo.avg_organic_conversion_rate}
            min={0}
            max={10}
            suffix="%"
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Track your SEO performance"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="seo-roi-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Revenue Goal &mdash; How to reach your 12-month target
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target 12-Month Revenue</label>
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
          monthlySeoBudget: 'SEO Budget',
          currentOrganicTraffic: 'Current Traffic',
          expectedTrafficGrowth: 'Traffic Growth %',
          organicConversionRate: 'Conv. Rate',
          avgConversionValue: 'Conv. Value',
          timeToResultsMonths: 'Time to Results',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding SEO Return on Investment</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Search engine optimization is one of the few marketing channels where your investment compounds
            over time. Unlike paid advertising, where traffic stops the moment you stop paying, the content
            and authority you build through SEO continues generating organic traffic for months or years
            after publication. This compounding effect is what makes SEO one of the highest-ROI channels
            for businesses willing to invest patiently.
          </p>
          <p>
            However, SEO also has a delayed payoff. Most campaigns require 4&ndash;6 months of sustained
            investment before generating meaningful traffic and revenue. This calculator models that
            ramp-up period explicitly, showing you the crossover point where cumulative revenue exceeds
            cumulative cost &mdash; your break-even month.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How SEO ROI Is Calculated</h3>
          <p>
            SEO ROI measures total revenue generated from organic search relative to the total cost
            of your SEO program. The formula is: ROI = ((Cumulative Revenue - Cumulative Cost) / Cumulative
            Cost) x 100. This calculator projects traffic growth month over month based on your expected
            growth rate, accounts for a ramp-up period before full results materialize, and sums
            conversions and revenue across all 12 months to give you a comprehensive view of your
            investment return.
          </p>
          <p>
            The break-even month is particularly important for budgeting decisions. If your SEO program
            breaks even in month 5, every subsequent month is pure profit &mdash; and that profit continues
            indefinitely as long as you maintain your rankings. To track your ranking progress and identify the keywords driving the most value, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides comprehensive rank tracking and organic traffic analytics</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Factors That Impact SEO ROI</h3>
          <p>
            Several variables significantly affect your SEO return. Your current domain authority determines
            how quickly you can rank for competitive keywords. Your content strategy and keyword selection
            determine whether you attract high-intent traffic that converts. Your on-site conversion rate
            determines how effectively you turn visitors into customers. And your time horizon determines
            whether your investment has enough runway to compound.
          </p>
          <p>
            The most common mistake in evaluating SEO ROI is using too short a time frame. A campaign
            that looks unprofitable at 6 months may deliver extraordinary returns at 12&ndash;18 months as
            content matures, backlinks accumulate, and domain authority grows. Use the scenario comparison
            feature in this calculator to model conservative, moderate, and aggressive growth assumptions
            side by side.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Your SEO Investment</h3>
          <p>
            The highest-leverage actions for improving SEO ROI fall into three categories. First, keyword
            strategy: targeting the right mix of high-volume and low-competition terms ensures faster
            rankings and better traffic quality. Second, content quality: comprehensive, well-structured
            content that genuinely serves search intent earns better rankings, more backlinks, and higher
            conversion rates. Third, technical SEO: ensuring your site is fast, crawlable, and properly
            structured removes barriers that prevent your content from ranking. For a data-driven approach to keyword research and competitive analysis, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s keyword research and site audit tools to maximize your SEO budget</a>.
          </p>
          <p>
            Use the Risk Radar above to identify which input variable most impacts your projected profit.
            If conversion rate sensitivity is highest, invest in landing page optimization and conversion
            rate experiments. If traffic growth sensitivity dominates, focus on content production and
            link building to accelerate organic traffic acquisition.
          </p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="seo-roi-calculator" />
      <PreRelatedCTA toolSlug="seo-roi-calculator" />
      <RelatedTools currentSlug="seo-roi-calculator" />
    </div>
  );
}
