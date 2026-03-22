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
  subscribers: 5000,
  monthlyEmails: 8,
  openRate: 42,
  clickRate: 3.5,
  sponsorshipCPM: 50,
  sponsoredEmailsPerMonth: 2,
  paidSubscriberRate: 5,
  paidSubscriptionPrice: 10,
  monthlyChurnRate: 2.5,
  acquisitionCost: 3.50,
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
    question: 'What is a good revenue per subscriber for a newsletter?',
    answer: 'The industry average is approximately $0.11 per subscriber per month. However, highly monetized newsletters in B2B niches or finance can generate $0.50 to $2.00 per subscriber per month through premium subscriptions and high-CPM sponsorships. The key drivers are niche value (B2B and finance audiences command higher CPMs), engagement rates, and the mix of monetization strategies you employ.',
  },
  {
    question: 'How do I calculate newsletter subscriber lifetime value?',
    answer: 'Subscriber LTV equals your monthly revenue per subscriber multiplied by the average subscriber lifetime in months. Average lifetime is calculated as 100 divided by your monthly churn rate. For example, with a 2.5% monthly churn rate, your average subscriber stays for 40 months. If each subscriber generates $0.15 per month, the LTV is $6.00. This metric is critical for determining how much you can afford to spend on subscriber acquisition.',
  },
  {
    question: 'What is a good LTV-to-CAC ratio for newsletters?',
    answer: 'A healthy LTV-to-CAC ratio is 3:1 or higher, meaning each subscriber generates at least three times what it cost to acquire them. Ratios below 1:1 mean you are losing money on every subscriber. Between 1:1 and 3:1 is a cautionary zone where your unit economics work but leave little margin for error. Top-performing newsletters achieve 5:1 or higher through organic growth, referral programs, and strong retention.',
  },
  {
    question: 'How can I reduce my newsletter churn rate?',
    answer: 'Focus on delivering consistent, high-value content that subscribers cannot easily find elsewhere. Segment your audience and personalize content to improve relevance. Send a welcome series that sets expectations and delivers immediate value. Monitor engagement metrics and re-engage inactive subscribers before they churn. Many newsletter operators find that reducing send frequency actually lowers churn — quality consistently beats quantity.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const sponsorRevenue = (inp.subscribers / 1000) * inp.sponsorshipCPM * inp.sponsoredEmailsPerMonth;
  const paidRevenue = inp.subscribers * (inp.paidSubscriberRate / 100) * inp.paidSubscriptionPrice;
  const totalMonthlyRevenue = sponsorRevenue + paidRevenue;
  const revenuePerSubscriber = inp.subscribers > 0 ? totalMonthlyRevenue / inp.subscribers : 0;
  const avgLifetimeMonths = inp.monthlyChurnRate > 0 ? 100 / inp.monthlyChurnRate : 0;
  const ltv = revenuePerSubscriber * avgLifetimeMonths;
  const ltvCacRatio = inp.acquisitionCost > 0 ? ltv / inp.acquisitionCost : 0;
  const annualRevenue = totalMonthlyRevenue * 12;
  return { sponsorRevenue, paidRevenue, totalMonthlyRevenue, revenuePerSubscriber, avgLifetimeMonths, ltv, ltvCacRatio, annualRevenue };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function NewsletterValueCalculatorClient() {
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
    const saved = loadFromLocalStorage('newsletter-value-calculator');
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
    saveToLocalStorage('newsletter-value-calculator', inputs);
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
    const sponsorRev = ((inp.subscribers || 0) / 1000) * (inp.sponsorshipCPM || 0) * (inp.sponsoredEmailsPerMonth || 0);
    const paidRev = (inp.subscribers || 0) * ((inp.paidSubscriberRate || 0) / 100) * (inp.paidSubscriptionPrice || 0);
    return sponsorRev + paidRev;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Needed subscribers
    const currentRevPerSub = m.revenuePerSubscriber > 0 ? m.revenuePerSubscriber : 0.01;
    const neededSubs = Math.ceil(goalRevenue / currentRevPerSub);
    results.push({
      label: 'Grow Subscriber Base',
      description: `Grow to ${formatNumber(neededSubs)} subscribers`,
      change: inputs.subscribers > 0 ? ((neededSubs - inputs.subscribers) / inputs.subscribers) * 100 : 0,
    });
    // Path 2: Increase sponsorship CPM
    const currentSponsorRevenuePerCPM = (inputs.subscribers / 1000) * inputs.sponsoredEmailsPerMonth;
    const remainingFromPaid = m.paidRevenue;
    const neededSponsorRevenue = goalRevenue - remainingFromPaid;
    const neededCPM = currentSponsorRevenuePerCPM > 0 ? neededSponsorRevenue / currentSponsorRevenuePerCPM : 0;
    results.push({
      label: 'Increase Sponsorship CPM',
      description: `Raise CPM to $${Math.max(0, neededCPM).toFixed(0)}`,
      change: inputs.sponsorshipCPM > 0 ? ((neededCPM - inputs.sponsorshipCPM) / inputs.sponsorshipCPM) * 100 : 0,
    });
    // Path 3: Increase paid subscriber rate
    const remainingFromSponsors = m.sponsorRevenue;
    const neededPaidRevenue = goalRevenue - remainingFromSponsors;
    const neededPaidRate = inputs.subscribers > 0 && inputs.paidSubscriptionPrice > 0
      ? (neededPaidRevenue / (inputs.subscribers * inputs.paidSubscriptionPrice)) * 100
      : 0;
    results.push({
      label: 'Convert More Paid Subscribers',
      description: `Paid rate to ${Math.max(0, neededPaidRate).toFixed(1)}%`,
      change: inputs.paidSubscriberRate > 0 ? ((neededPaidRate - inputs.paidSubscriberRate) / inputs.paidSubscriberRate) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — revenue breakdown
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Sponsorship Revenue', 'Paid Subscription Revenue'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.sponsorRevenue, s.metrics.paidRevenue],
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
            return `${ctx.dataset.label}: $${(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
    if (m.ltvCacRatio < 1) {
      return {
        status: 'danger',
        title: `LTV:CAC ratio of ${m.ltvCacRatio.toFixed(1)}x — you are losing money on every subscriber.`,
        actions: [
          {
            icon: '🚨',
            text: 'Your subscriber acquisition cost exceeds their lifetime value. Reduce CAC or increase monetization immediately.',
            affiliateText: 'Grow organically with Beehiiv → Start free',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '📉', text: 'Focus on organic growth (referrals, SEO, social) to reduce acquisition costs below your LTV.' },
          { icon: '💰', text: 'Add or increase monetization — sponsorships, paid tiers, or affiliate revenue to raise subscriber value.' },
        ],
      };
    }
    if (m.ltvCacRatio < 3) {
      return {
        status: 'warning',
        title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x is positive but below the 3x benchmark for healthy unit economics.`,
        actions: [
          { icon: '🎯', text: 'Reduce churn — improve content quality, personalization, and welcome sequences to extend subscriber lifetime.' },
          {
            icon: '📊',
            text: 'Increase sponsorship rates by building engagement metrics that justify premium CPMs.',
            affiliateText: 'Boost engagement with Beehiiv → Start free',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '📧', text: 'Launch a referral program to reduce effective acquisition cost through organic word-of-mouth growth.', link: '/tools/email-roi-calculator' },
        ],
      };
    }
    if (m.ltvCacRatio < 5) {
      return {
        status: 'good',
        title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x is healthy. Your newsletter economics are solid.`,
        actions: [
          { icon: '📈', text: 'Scale subscriber acquisition — your unit economics support aggressive growth investment.' },
          {
            icon: '🔄',
            text: 'Experiment with premium tiers, courses, or community offerings to increase revenue per subscriber.',
            affiliateText: 'Scale your newsletter with Beehiiv → Start free',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '🧪', text: 'A/B test sponsorship placements and pricing to maximize ad revenue without hurting engagement.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `LTV:CAC of ${m.ltvCacRatio.toFixed(1)}x is exceptional — your newsletter is a highly profitable asset.`,
      actions: [
        {
          icon: '🚀',
          text: 'Invest heavily in subscriber growth — each new subscriber is extremely profitable at this ratio.',
          affiliateText: 'Supercharge growth with Beehiiv → Start free',
          affiliateUrl: affiliateData.partners.beehiiv.url,
        },
        { icon: '🌐', text: 'Consider launching additional newsletters or verticals to replicate your success in adjacent niches.' },
        { icon: '📧', text: 'Explore acquisition offers — newsletters with 5x+ LTV:CAC ratios command premium valuations.', link: '/tools/content-roi-calculator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Newsletter Subscriber Value Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate your newsletter subscriber lifetime value, monthly revenue from sponsorships
          and paid subscriptions, and LTV-to-CAC ratio. Model different monetization scenarios
          and benchmark against industry averages — all in real time.
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
            label="Total Subscribers"
            value={inputs.subscribers}
            min={100}
            max={500000}
            step={100}
            onChange={(v) => update('subscribers', v)}
            benchmarkChips={[
              { label: '1K', value: 1000 },
              { label: '5K', value: 5000 },
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
            ]}
          />
          <ScenarioSlider
            label="Sponsorship CPM"
            value={inputs.sponsorshipCPM}
            min={5}
            max={200}
            step={1}
            prefix="$"
            benchmark={benchmarks.newsletter.avg_sponsor_cpm}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('sponsorshipCPM', v)}
          />
          <ScenarioSlider
            label="Sponsored Emails / Month"
            value={inputs.sponsoredEmailsPerMonth}
            min={0}
            max={12}
            step={1}
            onChange={(v) => update('sponsoredEmailsPerMonth', v)}
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
                label="Monthly Emails Sent"
                value={inputs.monthlyEmails}
                min={1}
                max={30}
                step={1}
                onChange={(v) => update('monthlyEmails', v)}
              />
              <ScenarioSlider
                label="Open Rate"
                value={inputs.openRate}
                min={5}
                max={80}
                step={0.5}
                suffix="%"
                benchmark={benchmarks.newsletter.avg_open_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('openRate', v)}
              />
              <ScenarioSlider
                label="Click Rate"
                value={inputs.clickRate}
                min={0.5}
                max={15}
                step={0.1}
                suffix="%"
                benchmark={benchmarks.newsletter.avg_click_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('clickRate', v)}
              />
              <ScenarioSlider
                label="Paid Subscriber Rate"
                value={inputs.paidSubscriberRate}
                min={0}
                max={30}
                step={0.5}
                suffix="%"
                benchmark={benchmarks.newsletter.avg_paid_subscriber_rate}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('paidSubscriberRate', v)}
              />
              <ScenarioSlider
                label="Paid Subscription Price"
                value={inputs.paidSubscriptionPrice}
                min={1}
                max={100}
                step={1}
                prefix="$"
                onChange={(v) => update('paidSubscriptionPrice', v)}
                benchmarkChips={[
                  { label: '$5/mo', value: 5 },
                  { label: '$10/mo', value: 10 },
                  { label: '$25/mo', value: 25 },
                  { label: '$50/mo', value: 50 },
                ]}
              />
              <ScenarioSlider
                label="Monthly Churn Rate"
                value={inputs.monthlyChurnRate}
                min={0.5}
                max={15}
                step={0.1}
                suffix="%"
                benchmark={benchmarks.newsletter.avg_churn_rate_monthly}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('monthlyChurnRate', v)}
              />
              <ScenarioSlider
                label="Subscriber Acquisition Cost"
                value={inputs.acquisitionCost}
                min={0}
                max={25}
                step={0.25}
                prefix="$"
                benchmark={benchmarks.newsletter.avg_acquisition_cost}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('acquisitionCost', v)}
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
                title="Monthly Revenue"
                value={formatCurrency(m.totalMonthlyRevenue)}
                subtitle={`${formatCurrency(m.annualRevenue, 0)}/yr`}
                color={m.totalMonthlyRevenue >= 1000 ? 'green' : 'amber'}
              />
              <KPICard
                title="Rev / Sub / Month"
                value={formatCurrency(m.revenuePerSubscriber, 2)}
                subtitle={`LTV: ${formatCurrency(m.ltv, 2)}`}
                color={m.revenuePerSubscriber >= 0.11 ? 'green' : 'amber'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Subscriber LTV"
                value={formatCurrency(m.ltv, 2)}
                subtitle={`LTV:CAC ${m.ltvCacRatio.toFixed(1)}x`}
                color={m.ltvCacRatio >= 3 ? 'green' : m.ltvCacRatio >= 1 ? 'amber' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">Monthly Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.totalMonthlyRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Rev/Sub/Mo</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.revenuePerSubscriber, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Subscriber LTV</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.ltv, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="newsletter-value-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Revenue Breakdown</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Revenue per Subscriber vs. Average"
            value={m.revenuePerSubscriber}
            benchmark={benchmarks.newsletter.avg_subscriber_value_monthly}
            min={0}
            max={1}
            prefix="$"
            affiliateUrl={affiliateData.partners.beehiiv.url}
            affiliateText="Grow your newsletter revenue"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="newsletter-value-calculator" inputs={inputs} />
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
          subscribers: 'Subscribers',
          monthlyEmails: 'Emails/Month',
          openRate: 'Open Rate',
          clickRate: 'Click Rate',
          sponsorshipCPM: 'Sponsor CPM',
          sponsoredEmailsPerMonth: 'Sponsored/Mo',
          paidSubscriberRate: 'Paid Sub Rate',
          paidSubscriptionPrice: 'Paid Price',
          monthlyChurnRate: 'Churn Rate',
          acquisitionCost: 'Acq. Cost',
        }}
        calculateFn={calcProfit}
        resultLabel="monthly revenue"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Newsletter Subscriber Value</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Newsletters have become one of the most valuable digital assets a creator or business can
            build. Unlike social media followers — where algorithms control your reach — email
            subscribers represent a direct, owned relationship with your audience. But not all
            subscribers are created equal. Understanding the true economic value of each subscriber
            is essential for making smart decisions about growth investment, monetization strategy,
            and content direction.
          </p>
          <p>
            This calculator models two primary revenue streams: sponsorship revenue (based on your
            list size and CPM rates) and paid subscription revenue (based on conversion rate and
            pricing). It then calculates your subscriber lifetime value by factoring in churn, and
            compares that LTV against your acquisition cost to determine whether your growth
            investment is sustainable. The result is a complete picture of your newsletter economics.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">How Newsletter Revenue Works</h3>
          <p>
            Newsletter monetization typically follows two models. Sponsorship revenue is calculated as
            your list size divided by 1,000 (to get your &quot;thousands&quot;) multiplied by your CPM
            rate and the number of sponsored sends per month. A 10,000-subscriber newsletter charging
            $50 CPM and sending 4 sponsored issues per month generates $2,000 in sponsorship revenue.
            Paid subscription revenue adds another layer — if 5% of your list pays $10/month, that is
            an additional $5,000 in recurring revenue for a 100,000-subscriber list.
          </p>
          <p>
            The real power metric is subscriber lifetime value (LTV). LTV combines your monthly revenue
            per subscriber with the average subscriber lifespan (calculated from your churn rate). A
            subscriber generating $0.15/month with a 2.5% monthly churn rate has an LTV of $6.00.
            When your LTV exceeds your subscriber acquisition cost (CAC) by 3x or more, you have a
            sustainable growth engine. To optimize these economics and scale your newsletter, <a href={affiliateData.partners.beehiiv.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Beehiiv provides built-in monetization tools including sponsorship management and premium subscriptions</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Key Benchmarks for Newsletter Economics</h3>
          <p>
            The average newsletter subscriber is worth approximately $0.11 per month, but top creators
            in high-value niches (finance, B2B SaaS, investing) generate $0.50 to $2.00 per subscriber
            per month. Sponsorship CPMs range from $10 for general-interest newsletters to $100+ for
            highly targeted B2B audiences. Average open rates sit around 42% for newsletters (higher
            than marketing emails because subscribers opted in for the content), and click rates
            average 3.5%. Monthly churn rates average 2.5%, giving an average subscriber lifespan of
            about 40 months.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Strategies to Increase Subscriber Value</h3>
          <p>
            The most effective levers for increasing subscriber value are reducing churn (which extends
            lifetime and multiplies every dollar of monthly revenue) and adding revenue streams. Many
            newsletter operators start with sponsorships alone but find that adding a paid tier
            dramatically increases per-subscriber revenue. Other options include affiliate revenue,
            digital products, courses, and community memberships. The key is matching your
            monetization strategy to your audience and niche. For comprehensive newsletter growth and
            monetization, <a href={affiliateData.partners.beehiiv.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Beehiiv&apos;s newsletter platform with built-in referral programs and monetization features to grow your subscriber base and revenue</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="newsletter-value-calculator" />
      <PreRelatedCTA toolSlug="newsletter-value-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="newsletter-value-calculator" />
    </div>
  );
}
