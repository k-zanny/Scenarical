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
  monthlyOrganicVisitors: 10000,
  avgCPCEquivalent: 2.50,
  organicConversionRate: 2.4,
  avgConversionValue: 75,
  paidTrafficPercent: 30,
  paidCPC: 3.00,
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
    question: 'What is blog traffic value?',
    answer: 'Blog traffic value is the estimated monetary worth of your organic traffic measured as the equivalent cost of acquiring that same traffic through paid search ads. If you receive 10,000 organic visitors per month and the average CPC in your niche is $2.50, your traffic is worth $25,000/month in ad-equivalent value. This metric helps you understand the hidden asset your organic content represents and justify continued investment in SEO and content marketing.',
  },
  {
    question: 'How do I increase the value of my organic traffic?',
    answer: 'There are two primary levers: increase the volume of organic traffic (through more content and better rankings) or increase the value per visitor (through higher conversion rates and higher average order values). Improving your content to target higher-CPC keywords also increases ad-equivalent value. The most impactful approach is usually optimizing conversion rates, since that directly turns existing traffic into more revenue without requiring additional visitors.',
  },
  {
    question: 'Is organic traffic really free?',
    answer: 'Organic traffic is not truly free \u2014 it requires investment in content creation, SEO optimization, and link building. However, unlike paid advertising, organic traffic continues flowing without ongoing per-click costs. Once a piece of content ranks, it can generate traffic for months or years with minimal maintenance. This makes the long-term ROI of organic traffic significantly higher than paid channels for most businesses.',
  },
  {
    question: 'How do I calculate cost savings from organic vs paid traffic?',
    answer: 'Calculate what it would cost to replace your organic traffic with paid ads: multiply your monthly organic visitors by the average CPC you would pay in Google Ads for those same keywords. This is your cost-to-replace figure. Your monthly savings equals the cost-to-replace minus any ongoing SEO costs. For most established sites, organic traffic saves thousands or tens of thousands of dollars per month compared to paid acquisition.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const organicTrafficValue = inp.monthlyOrganicVisitors * inp.avgCPCEquivalent;
  const organicConversions = inp.monthlyOrganicVisitors * inp.organicConversionRate / 100;
  const organicRevenue = organicConversions * inp.avgConversionValue;
  const annualTrafficValue = organicTrafficValue * 12;
  const annualOrganicRevenue = organicRevenue * 12;
  const costToReplacePaid = inp.monthlyOrganicVisitors * inp.paidCPC;
  const monthlySavings = costToReplacePaid;
  const annualSavings = monthlySavings * 12;
  const valuePerVisitor = inp.monthlyOrganicVisitors > 0 ? organicRevenue / inp.monthlyOrganicVisitors : 0;

  // Build monthly projection for chart (organic value vs cost-to-replace)
  const months: number[] = [];
  const organicValues: number[] = [];
  const paidCosts: number[] = [];
  const organicRevenues: number[] = [];

  for (let n = 1; n <= 12; n++) {
    months.push(n);
    organicValues.push(organicTrafficValue * n);
    paidCosts.push(costToReplacePaid * n);
    organicRevenues.push(organicRevenue * n);
  }

  return {
    organicTrafficValue,
    organicConversions,
    organicRevenue,
    annualTrafficValue,
    annualOrganicRevenue,
    costToReplacePaid,
    monthlySavings,
    annualSavings,
    valuePerVisitor,
    months,
    organicValues,
    paidCosts,
    organicRevenues,
  };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function TrafficValueCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(10000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  useEffect(() => {
    const saved = loadFromLocalStorage('traffic-value-calculator');
    if (saved) setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...saved } }]);
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => { if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v); });
    if (Object.keys(urlInputs).length > 0) setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
  }, []);

  useEffect(() => { saveToLocalStorage('traffic-value-calculator', inputs); }, [inputs]);

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
    const visitors = inp.monthlyOrganicVisitors || 0;
    const conversions = visitors * ((inp.organicConversionRate || 0) / 100);
    const revenue = conversions * (inp.avgConversionValue || 0);
    return revenue;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results: { label: string; description: string; change: number }[] = [];
    // Path 1: Increase traffic
    const neededTraffic = m.valuePerVisitor > 0 ? goalRevenue / m.valuePerVisitor : 0;
    results.push({
      label: 'Grow Organic Traffic',
      description: `Traffic to ${formatNumber(Math.ceil(neededTraffic))} visitors/mo`,
      change: inputs.monthlyOrganicVisitors > 0 ? ((neededTraffic - inputs.monthlyOrganicVisitors) / inputs.monthlyOrganicVisitors) * 100 : 0,
    });
    // Path 2: Improve conversion rate
    const neededConversions = inputs.avgConversionValue > 0 ? goalRevenue / inputs.avgConversionValue : 0;
    const neededConvRate = inputs.monthlyOrganicVisitors > 0 ? (neededConversions / inputs.monthlyOrganicVisitors) * 100 : 0;
    results.push({
      label: 'Improve Conversion Rate',
      description: `Conversion rate to ${neededConvRate.toFixed(2)}%`,
      change: inputs.organicConversionRate > 0 ? ((neededConvRate - inputs.organicConversionRate) / inputs.organicConversionRate) * 100 : 0,
    });
    // Path 3: Increase average conversion value
    const neededAOV = m.organicConversions > 0 ? goalRevenue / m.organicConversions : 0;
    results.push({
      label: 'Increase Conversion Value',
      description: `Avg value to ${formatCurrency(neededAOV)}`,
      change: inputs.avgConversionValue > 0 ? ((neededAOV - inputs.avgConversionValue) / inputs.avgConversionValue) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: m.months.map(n => `Mo ${n}`),
    datasets: allMetrics.flatMap((s, idx) => [
      {
        label: `${s.label} \u2014 Organic Traffic Value`,
        data: s.metrics.organicValues,
        borderColor: scenarioColors[idx],
        backgroundColor: `${scenarioColors[idx]}20`,
        fill: true,
        pointRadius: 2,
        tension: 0.3,
      },
      {
        label: `${s.label} \u2014 Cost to Replace (Paid)`,
        data: s.metrics.paidCosts,
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
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
    if (m.organicRevenue < 500) {
      return {
        status: 'danger',
        title: `Monthly organic revenue of ${formatCurrency(m.organicRevenue)} is very low \u2014 your traffic is undermonetized.`,
        actions: [
          { icon: '\uD83C\uDFAF', text: 'Add clear calls-to-action and conversion paths to your highest-traffic pages to capture more leads and sales.', affiliateText: 'Find high-value keywords with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCDD', text: 'Create content targeting commercial-intent keywords that attract visitors ready to buy or convert.' },
          { icon: '\uD83D\uDD04', text: 'Implement conversion rate optimization \u2014 even small improvements multiply revenue from existing traffic.' },
        ],
      };
    }
    if (m.organicRevenue < 5000) {
      return {
        status: 'warning',
        title: `${formatCurrency(m.organicRevenue)}/mo in organic revenue. Your traffic has untapped value.`,
        actions: [
          { icon: '\uD83D\uDCC8', text: 'Scale content production to grow organic traffic \u2014 focus on topics with high search volume and commercial intent.' },
          { icon: '\uD83D\uDCB0', text: 'Optimize high-traffic pages for conversions \u2014 better CTAs, forms, and landing page design.', affiliateText: 'Analyze your top pages with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDCCA', text: 'Increase average order value through upselling, bundles, and premium offerings.', link: '/tools/landing-page-estimator' },
        ],
      };
    }
    if (m.organicRevenue < 20000) {
      return {
        status: 'good',
        title: `${formatCurrency(m.organicRevenue)}/mo in organic revenue \u2014 your content is working well.`,
        actions: [
          { icon: '\uD83D\uDCC8', text: 'Build content clusters around your highest-converting topics to compound organic traffic.' },
          { icon: '\uD83D\uDD17', text: 'Invest in link building to boost rankings on pages that are close to page 1 positions.', affiliateText: 'Find link building opportunities with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
          { icon: '\uD83D\uDD04', text: 'Update and refresh older content to maintain rankings and capture new search demand.' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `${formatCurrency(m.organicRevenue)}/mo \u2014 your organic traffic is a major revenue driver.`,
      actions: [
        { icon: '\uD83D\uDE80', text: 'Protect your organic revenue by monitoring rankings and proactively updating content before it declines.', affiliateText: 'Monitor rankings with Semrush', affiliateUrl: affiliateData.partners.semrush.url },
        { icon: '\uD83C\uDF10', text: 'Expand into international markets or adjacent content verticals to grow your organic footprint.' },
        { icon: '\uD83D\uDCB0', text: 'Consider shifting paid ad budget to organic investment \u2014 your organic channel delivers better long-term ROI.', link: '/tools/roas-calculator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Blog Traffic Value Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate the ad-equivalent value of your organic traffic, see how much it would
          cost to replace with paid ads, and model your organic revenue potential. Compare
          scenarios and benchmark against industry averages &mdash; all in real time.
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
            label="Monthly Organic Visitors"
            value={inputs.monthlyOrganicVisitors}
            min={100}
            max={1000000}
            step={100}
            onChange={(v) => update('monthlyOrganicVisitors', v)}
            benchmarkChips={[
              { label: '1K', value: 1000 },
              { label: '5K', value: 5000 },
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
            ]}
          />
          <ScenarioSlider
            label="Avg CPC Equivalent"
            value={inputs.avgCPCEquivalent}
            min={0.10}
            max={20}
            step={0.10}
            prefix="$"
            benchmark={benchmarks.seo.avg_keyword_cpc}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('avgCPCEquivalent', v)}
          />
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
                label="Average Conversion Value"
                value={inputs.avgConversionValue}
                min={1}
                max={1000}
                step={1}
                prefix="$"
                onChange={(v) => update('avgConversionValue', v)}
                benchmarkChips={[
                  { label: 'eComm $50', value: 50 },
                  { label: 'SaaS $100', value: 100 },
                  { label: 'B2B $300', value: 300 },
                ]}
              />
              <ScenarioSlider
                label="Paid Traffic Percent"
                value={inputs.paidTrafficPercent}
                min={0}
                max={100}
                step={1}
                suffix="%"
                onChange={(v) => update('paidTrafficPercent', v)}
              />
              <ScenarioSlider
                label="Paid CPC"
                value={inputs.paidCPC}
                min={0.10}
                max={30}
                step={0.10}
                prefix="$"
                benchmark={benchmarks.advertising.google_ads.avg_cpc}
                benchmarkLabel="Google Ads avg"
                onChange={(v) => update('paidCPC', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Monthly Traffic Value"
                value={formatCurrency(m.organicTrafficValue)}
                subtitle="ad-equivalent value"
                color="blue"
              />
              <KPICard
                title="Monthly Organic Revenue"
                value={formatCurrency(m.organicRevenue)}
                subtitle={`${Math.round(m.organicConversions)} conversions`}
                color={m.organicRevenue > 0 ? 'green' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Annual Savings vs Paid"
                value={formatCurrency(m.annualSavings)}
                subtitle={`${formatCurrency(m.monthlySavings)}/mo saved`}
                color="green"
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
                      <p className="text-[10px] text-muted uppercase">Traffic Value</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.organicTrafficValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Organic Revenue</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.organicRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Annual Savings</p>
                      <p className="font-mono text-lg font-bold text-success">
                        {formatCurrency(s.metrics.annualSavings)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="traffic-value-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Organic Value vs. Cost to Replace (Cumulative)</h3>
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
            affiliateText="Analyze your traffic value"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="traffic-value-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Revenue Goal &mdash; How to reach your monthly organic revenue target
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Organic Revenue</label>
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
          monthlyOrganicVisitors: 'Organic Visitors',
          avgCPCEquivalent: 'CPC Equivalent',
          organicConversionRate: 'Conv. Rate',
          avgConversionValue: 'Conv. Value',
          paidTrafficPercent: 'Paid Traffic %',
          paidCPC: 'Paid CPC',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly organic revenue"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Blog Traffic Value</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Every visitor to your website represents real monetary value, whether they convert immediately
            or not. Blog traffic value quantifies this by calculating the ad-equivalent cost of your
            organic traffic &mdash; what you would have to pay in Google Ads to acquire the same visitors.
            For most websites with established organic rankings, this value represents a significant hidden
            asset that grows every month without proportional increases in spending.
          </p>
          <p>
            This calculator goes beyond simple ad-equivalent valuation to also model your actual organic
            revenue (traffic times conversion rate times average order value) and the annual savings
            your organic traffic provides compared to paid acquisition. Understanding all three dimensions
            gives you a complete picture of your organic traffic&apos;s financial contribution.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Traffic Value Is Calculated</h3>
          <p>
            Ad-equivalent traffic value is calculated by multiplying your monthly organic visitors by the
            average CPC (cost per click) you would pay for those same keywords in Google Ads. This gives
            you the dollar amount you would need to spend on paid search to generate equivalent traffic.
            The industry average CPC is approximately $2.50, but this varies dramatically by niche &mdash;
            legal and insurance keywords can exceed $50 per click, while informational queries may be
            under $1.00. To understand the exact CPC values for your specific keywords, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides detailed keyword-level CPC data and traffic value calculations</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Organic Traffic vs. Paid Acquisition</h3>
          <p>
            The fundamental advantage of organic traffic is its compounding nature. A blog post published
            today can generate traffic for years without per-click costs. In contrast, paid advertising
            requires continuous spending &mdash; the moment you stop paying, the traffic stops. This makes
            organic traffic an increasingly valuable asset over time. The chart above illustrates this by
            comparing the cumulative value of your organic traffic against what it would cost to acquire
            the same visitors through paid channels.
          </p>
          <p>
            However, organic traffic is not truly &quot;free&quot; &mdash; it requires investment in content
            creation, SEO optimization, and link building. The key insight is that these are largely fixed
            or one-time costs, while the traffic they generate continues indefinitely. For most businesses,
            the long-term ROI of organic content significantly exceeds paid advertising.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Your Traffic Value</h3>
          <p>
            There are two primary paths to increasing traffic value: grow the volume of traffic or increase
            the value per visitor. Growing traffic requires creating more high-quality content, building
            backlinks, and improving technical SEO. Increasing value per visitor requires conversion rate
            optimization &mdash; better landing pages, stronger CTAs, and more compelling offers. The Risk
            Radar above shows which lever has the greatest impact on your specific situation. For a comprehensive view of which content topics drive the most valuable traffic, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s content marketing toolkit to discover high-value content opportunities</a>.
          </p>
          <p>
            Use the scenario comparison feature to model different traffic levels and conversion rates
            side by side. This helps you understand whether your highest-impact move is acquiring more
            visitors or better monetizing the ones you already have.
          </p>
        </div>
      </div>

      <FAQSection faqs={faqs} />
      <FeedbackWidget toolSlug="traffic-value-calculator" />
      <PreRelatedCTA toolSlug="traffic-value-calculator" />
      <RelatedTools currentSlug="traffic-value-calculator" />
    </div>
  );
}
