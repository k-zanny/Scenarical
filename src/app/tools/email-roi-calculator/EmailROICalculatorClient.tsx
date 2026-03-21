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
import { formatCurrency, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  listSize: 10000,
  emailsPerMonth: 8,
  openRate: 21.33,
  clickRate: 2.62,
  conversionRate: 1.22,
  avgOrderValue: 50,
  monthlyCost: 200,
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
    question: 'What is a good ROI for email marketing?',
    answer: 'The commonly cited benchmark is $36 earned for every $1 spent on email marketing, which translates to a 3,600% ROI. However, ROI varies widely by industry, list quality, and campaign type. E-commerce brands with well-segmented lists and strong automations often exceed this benchmark, while newer lists or B2B campaigns may see lower returns initially as they build engagement.',
  },
  {
    question: 'How do I improve my email open rate?',
    answer: 'Focus on writing compelling subject lines that spark curiosity or urgency, segment your list to send more relevant content, optimize send times based on your audience data, clean your list regularly to remove inactive subscribers, and ensure you have strong sender reputation. A/B testing subject lines consistently is one of the highest-leverage tactics.',
  },
  {
    question: 'Does list size or engagement matter more for email ROI?',
    answer: 'Engagement matters far more than raw list size. A smaller, highly engaged list will almost always outperform a large, disengaged one. Subscribers who regularly open and click generate the vast majority of email revenue. Focus on list quality — remove chronically inactive subscribers, use double opt-in, and segment by engagement level to maximize ROI.',
  },
  {
    question: 'How do I calculate revenue per email subscriber?',
    answer: 'Divide your total email-attributed monthly revenue by your total list size. This metric helps you understand the monetary value of each subscriber and makes it easier to justify acquisition costs. The industry average is around $0.11 per subscriber per month, but highly optimized e-commerce lists can generate $0.50 or more per subscriber.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const emailsSent = inp.listSize * inp.emailsPerMonth;
  const opens = emailsSent * inp.openRate / 100;
  const clicks = opens * inp.clickRate / 100;
  const conversions = clicks * inp.conversionRate / 100;
  const revenue = conversions * inp.avgOrderValue;
  const roi = inp.monthlyCost > 0 ? ((revenue - inp.monthlyCost) / inp.monthlyCost) * 100 : 0;
  const revenuePerSubscriber = inp.listSize > 0 ? revenue / inp.listSize : 0;
  const costPerConversion = conversions > 0 ? inp.monthlyCost / conversions : 0;
  return { emailsSent, opens, clicks, conversions, revenue, roi, revenuePerSubscriber, costPerConversion };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function EmailROICalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(5000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('email-roi-calculator');
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
    saveToLocalStorage('email-roi-calculator', inputs);
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
    const sent = (inp.listSize || 0) * (inp.emailsPerMonth || 0);
    const o = sent * (inp.openRate || 0) / 100;
    const c = o * (inp.clickRate || 0) / 100;
    const conv = c * (inp.conversionRate || 0) / 100;
    const rev = conv * (inp.avgOrderValue || 0);
    return rev - (inp.monthlyCost || 0);
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const scenarios = [];
    // Path 1: Needed list size
    const currentRevenuePerSub = m.revenuePerSubscriber > 0 ? m.revenuePerSubscriber : 0.01;
    const neededListSize = Math.ceil(goalRevenue / currentRevenuePerSub);
    scenarios.push({
      label: 'Increase List Size',
      description: `Grow list to ${neededListSize.toLocaleString()} subscribers`,
      change: inputs.listSize > 0 ? ((neededListSize - inputs.listSize) / inputs.listSize) * 100 : 0,
    });
    // Path 2: Improve open rate
    const currentClicksPerOpen = inputs.clickRate / 100;
    const currentConvPerClick = inputs.conversionRate / 100;
    const revenuePerOpen = currentClicksPerOpen * currentConvPerClick * inputs.avgOrderValue;
    const neededOpens = revenuePerOpen > 0 ? goalRevenue / revenuePerOpen : 0;
    const neededOpenRate = m.emailsSent > 0 ? (neededOpens / m.emailsSent) * 100 : 0;
    scenarios.push({
      label: 'Improve Open Rate',
      description: `Open rate to ${neededOpenRate.toFixed(1)}%`,
      change: inputs.openRate > 0 ? ((neededOpenRate - inputs.openRate) / inputs.openRate) * 100 : 0,
    });
    // Path 3: Improve conversion rate
    const revenuePerConversion = inputs.avgOrderValue;
    const neededConversions = revenuePerConversion > 0 ? goalRevenue / revenuePerConversion : 0;
    const neededConvRate = m.clicks > 0 ? (neededConversions / m.clicks) * 100 : 0;
    scenarios.push({
      label: 'Improve Conversion Rate',
      description: `Conversion rate to ${neededConvRate.toFixed(2)}%`,
      change: inputs.conversionRate > 0 ? ((neededConvRate - inputs.conversionRate) / inputs.conversionRate) * 100 : 0,
    });
    return scenarios.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — revenue funnel
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Opens', 'Clicks', 'Conversions', 'Revenue ($)'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.opens, s.metrics.clicks, s.metrics.conversions, s.metrics.revenue],
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
            if (v !== undefined && v >= 1) return `${ctx.dataset.label}: ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            return `${ctx.dataset.label}: ${(v ?? 0).toFixed(2)}`;
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
        title: `Your email ROI is ${m.roi.toFixed(0)}% — you are losing money on email marketing.`,
        actions: [
          {
            icon: '🧹',
            text: 'Clean your list — remove inactive subscribers dragging down open and click rates.',
            affiliateText: 'Verify your list with ZeroBounce → Try free',
            affiliateUrl: '#zerobounce-affiliate',
          },
          { icon: '✍️', text: 'Rewrite subject lines and preview text to boost open rates above the 21% benchmark.' },
          { icon: '💰', text: 'Evaluate your email platform cost — consider switching to a more cost-effective provider.' },
        ],
      };
    }
    if (m.roi < 1000) {
      return {
        status: 'warning',
        title: `ROI of ${m.roi.toFixed(0)}% is positive but well below the industry average of 3,600%.`,
        actions: [
          { icon: '🎯', text: 'Segment your list by engagement level and send targeted campaigns to active subscribers.' },
          {
            icon: '🛒',
            text: 'Add abandoned cart and post-purchase email automations to capture more revenue.',
            link: '/tools/roas-calculator',
            affiliateText: 'Automate flows with Klaviyo → Try free',
            affiliateUrl: '#klaviyo-affiliate',
          },
          { icon: '📊', text: 'A/B test email content, CTAs, and send times to optimize click-through rates.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    if (m.roi < 3000) {
      return {
        status: 'good',
        title: `ROI of ${m.roi.toFixed(0)}% is solid. You are approaching the industry benchmark of 3,600%.`,
        actions: [
          { icon: '📈', text: 'Scale your list — invest in lead magnets and opt-in incentives to grow subscribers.' },
          {
            icon: '🔄',
            text: 'Build advanced automation flows (welcome series, win-back, VIP tiers) to increase revenue per subscriber.',
            affiliateText: 'Build automations with Klaviyo → Try free',
            affiliateUrl: '#klaviyo-affiliate',
          },
          { icon: '🧪', text: 'Test personalization — dynamic content and product recommendations can lift conversion rates significantly.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `ROI of ${m.roi.toFixed(0)}% exceeds the industry benchmark — your email program is a top performer.`,
      actions: [
        {
          icon: '🚀',
          text: 'Aggressively grow your list — every new subscriber is highly valuable at this ROI level.',
          affiliateText: 'Grow your list with OptinMonster → Try free',
          affiliateUrl: '#optinmonster-affiliate',
        },
        { icon: '🌐', text: 'Expand to SMS and push notifications to capture revenue from additional channels.' },
        { icon: '📧', text: 'Increase email frequency — test sending more campaigns to capture incremental revenue.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Email ROI Calculator</h1>
        <p className="text-label max-w-2xl">
          This Email ROI Calculator lets you model your email marketing revenue across
          different list sizes and engagement rates. Drag sliders to simulate growth
          scenarios, see how your open and click rates compare to industry benchmarks,
          and share your analysis with your team — all in real time.
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
            label="Email List Size"
            value={inputs.listSize}
            min={100}
            max={1000000}
            step={100}
            onChange={(v) => update('listSize', v)}
            benchmarkChips={[
              { label: '1K', value: 1000 },
              { label: '5K', value: 5000 },
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
            ]}
          />
          <ScenarioSlider
            label="Open Rate"
            value={inputs.openRate}
            min={1}
            max={80}
            step={0.01}
            suffix="%"
            benchmark={benchmarks.email_marketing.avg_open_rate}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('openRate', v)}
          />
          <ScenarioSlider
            label="Average Order Value"
            value={inputs.avgOrderValue}
            min={1}
            max={500}
            step={1}
            prefix="$"
            onChange={(v) => update('avgOrderValue', v)}
            benchmarkChips={[
              { label: 'eComm $75', value: 75 },
              { label: 'SaaS $49', value: 49 },
              { label: 'B2B $500', value: 500 },
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
                label="Emails per Month"
                value={inputs.emailsPerMonth}
                min={1}
                max={30}
                step={1}
                onChange={(v) => update('emailsPerMonth', v)}
              />
              <ScenarioSlider
                label="Click Rate"
                value={inputs.clickRate}
                min={0.1}
                max={20}
                step={0.01}
                suffix="%"
                benchmark={benchmarks.email_marketing.avg_click_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('clickRate', v)}
              />
              <ScenarioSlider
                label="Conversion Rate"
                value={inputs.conversionRate}
                min={0.1}
                max={10}
                step={0.01}
                suffix="%"
                benchmark={benchmarks.email_marketing.avg_conversion_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('conversionRate', v)}
              />
              <ScenarioSlider
                label="Monthly Platform Cost"
                value={inputs.monthlyCost}
                min={0}
                max={10000}
                step={10}
                prefix="$"
                onChange={(v) => update('monthlyCost', v)}
              />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards — show comparison if multiple scenarios */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(m.revenue)}
                subtitle={`${Math.round(m.conversions)} conversions`}
                color={m.revenue > inputs.monthlyCost ? 'green' : 'red'}
              />
              <KPICard
                title="ROI"
                value={`${m.roi.toFixed(0)}%`}
                subtitle={inputs.monthlyCost > 0 ? `${(m.roi / 100).toFixed(1)}x return` : 'No cost entered'}
                color={m.roi >= 3600 ? 'green' : m.roi >= 1000 ? 'amber' : m.roi > 0 ? 'blue' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Rev / Sub / Month"
                value={formatCurrency(m.revenuePerSubscriber, 2)}
                subtitle={m.costPerConversion > 0 ? `$${m.costPerConversion.toFixed(2)} per conv.` : ''}
                color="blue"
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
                      <p className="text-[10px] text-muted uppercase">Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">ROI</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.roi >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.metrics.roi.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Rev/Sub/Mo</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.revenuePerSubscriber, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart — bigger height */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Email Revenue Funnel</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your ROI vs. Industry Average"
            value={m.roi}
            benchmark={benchmarks.email_marketing.avg_roi_per_dollar * 100}
            min={0}
            max={7200}
            suffix="%"
          />

          <div className="mt-4">
            <BenchmarkGauge
              label="Your Open Rate vs. Industry Average"
              value={inputs.openRate}
              benchmark={benchmarks.email_marketing.avg_open_rate}
              min={0}
              max={80}
              suffix="%"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <ShareButton slug="email-roi-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Revenue — How to reach your monthly goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Revenue</label>
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

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={{
          listSize: 'List Size',
          emailsPerMonth: 'Emails/Month',
          openRate: 'Open Rate',
          clickRate: 'Click Rate',
          conversionRate: 'Conv. Rate',
          avgOrderValue: 'Avg Order Value',
          monthlyCost: 'Platform Cost',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly profit"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Email Marketing ROI</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Email marketing remains one of the highest-returning channels in digital marketing.
            According to industry data, the average return on email marketing is $36 for every $1
            spent — a 3,600% ROI that dwarfs most other marketing channels. But that average hides
            enormous variation. Some brands earn $70+ per dollar while others barely break even. The
            difference comes down to list quality, segmentation, automation, and relentless optimization
            of the metrics that matter: open rate, click-through rate, and conversion rate.
          </p>
          <p>
            This calculator models your entire email revenue funnel — from list size and send frequency
            through opens, clicks, and conversions to actual revenue and profit. Unlike simpler tools
            that ask for a single &quot;revenue&quot; number, it lets you adjust each stage of the funnel
            independently so you can see exactly where improvements will have the biggest impact.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Email ROI Is Calculated</h3>
          <p>
            Email ROI measures the return you generate relative to your email marketing costs. The
            formula is: ROI = ((Revenue - Cost) / Cost) x 100. For example, if your email campaigns
            generate $4,000 in monthly revenue and your email platform costs $200 per month, your ROI
            is ((4000 - 200) / 200) x 100 = 1,900%. In other words, you earn $19 for every dollar
            spent on your email platform.
          </p>
          <p>
            But ROI alone does not tell you where to focus. That is why this calculator breaks down the
            full funnel. Your monthly emails sent (list size times send frequency) flow through your
            open rate to produce opens, then through your click rate to produce clicks, and finally
            through your conversion rate to produce paying customers. Each stage is a multiplier — a
            small improvement at any stage compounds through the entire funnel.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Metrics and Benchmarks</h3>
          <p>
            The average email open rate across all industries is approximately 21.33%. Click-through
            rates average 2.62%, and conversion rates from email average around 1.22%. These benchmarks
            give you a baseline, but your actual performance depends heavily on your industry, audience,
            and email strategy. E-commerce brands with strong segmentation and triggered automations
            (abandoned cart, browse abandonment, post-purchase) consistently outperform these averages.
          </p>
          <p>
            Revenue per subscriber is another critical metric. The industry average hovers around $0.11
            per subscriber per month. If your revenue per subscriber is significantly below this, it
            usually indicates issues with engagement (too many inactive subscribers), relevance (poor
            segmentation), or offer strength (weak calls to action or low-value products). Use the
            benchmark gauges in this calculator to see exactly where you stand.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How to Improve Your Email ROI</h3>
          <p>
            The highest-leverage improvements typically come from three areas. First, list hygiene:
            removing inactive subscribers improves deliverability and open rates, which lifts every
            downstream metric. Second, segmentation and personalization: sending the right message to
            the right subscriber at the right time dramatically increases click and conversion rates.
            Third, automation: triggered email flows (welcome series, abandoned cart, re-engagement)
            generate revenue continuously without manual effort, compounding your returns over time.
          </p>
          <p>
            Use the Risk Radar above to identify which input variable has the greatest impact on your
            profit. If open rate sensitivity is highest, focus on subject line optimization and list
            cleaning. If conversion rate sensitivity dominates, invest in landing page optimization and
            offer testing. The reverse goal mode lets you work backward from a revenue target to see
            exactly what list size, open rate, or conversion rate you need to hit your number.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="email-roi-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="email-roi-calculator" />
    </div>
  );
}
