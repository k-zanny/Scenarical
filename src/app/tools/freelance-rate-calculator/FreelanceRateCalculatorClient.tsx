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
  desiredAnnualIncome: 100000,
  annualExpenses: 15000,
  weeksPTO: 4,
  billableHoursPerWeek: 30,
  profitMargin: 20,
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
    question: 'How do I set the right freelance hourly rate?',
    answer: 'Start with your desired annual income, add all business expenses (software, insurance, taxes, equipment), then divide by your realistic billable hours per year. Most freelancers only bill 60-70% of their working hours — the rest goes to admin, marketing, and professional development. Add a profit margin of 15-25% on top to build a financial cushion and reinvest in your business.',
  },
  {
    question: 'What is a good profit margin for freelancers?',
    answer: 'The industry average profit margin for freelancers is around 35%, but this varies widely by specialty. Consultants and strategists often achieve 40-50% margins because their overhead is low, while freelancers with significant tool costs or subcontractors may operate closer to 15-25%. A healthy minimum target is 20% — anything below that leaves you vulnerable to unexpected expenses.',
  },
  {
    question: 'Should I charge hourly or project-based rates?',
    answer: 'Both models have merits. Hourly rates provide predictability and are easier to calculate, but they cap your earning potential at your available hours. Project-based pricing lets you capture more value from your expertise and efficiency — if you can complete a project in 10 hours that a less experienced freelancer needs 30 hours for, project pricing rewards your skill. Many successful freelancers use hourly rates as an internal benchmark and present project-based pricing to clients.',
  },
  {
    question: 'How many billable hours per week is realistic?',
    answer: 'The industry average is about 30 billable hours per week for full-time freelancers. The remaining 10-15 hours of a typical work week go to client communication, invoicing, marketing, professional development, and administrative tasks. Pushing beyond 35 billable hours per week is possible short-term but leads to burnout. If you consistently need more billable hours, it is a sign your rate is too low.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const workingWeeks = 52 - inp.weeksPTO;
  const totalAnnualCosts = inp.desiredAnnualIncome + inp.annualExpenses;
  const targetRevenue = totalAnnualCosts / (1 - inp.profitMargin / 100);
  const totalBillableHours = workingWeeks * inp.billableHoursPerWeek;
  const hourlyRate = totalBillableHours > 0 ? targetRevenue / totalBillableHours : 0;
  const monthlyRevenue = targetRevenue / 12;
  const dailyRate = hourlyRate * 8;
  const effectiveHourlyIncome = totalBillableHours > 0 ? inp.desiredAnnualIncome / totalBillableHours : 0;
  return { workingWeeks, totalAnnualCosts, targetRevenue, totalBillableHours, hourlyRate, monthlyRevenue, dailyRate, effectiveHourlyIncome };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function FreelanceRateCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalIncome, setGoalIncome] = useState(150000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('freelance-rate-calculator');
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
    saveToLocalStorage('freelance-rate-calculator', inputs);
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
    const ww = 52 - (inp.weeksPTO || 0);
    const costs = (inp.desiredAnnualIncome || 0) + (inp.annualExpenses || 0);
    const rev = costs / (1 - (inp.profitMargin || 0) / 100);
    const hours = ww * (inp.billableHoursPerWeek || 0);
    return hours > 0 ? rev / hours : 0;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    const workingWeeks = 52 - inputs.weeksPTO;
    // Path 1: Rate needed for target income
    const totalCosts = goalIncome + inputs.annualExpenses;
    const targetRev = totalCosts / (1 - inputs.profitMargin / 100);
    const totalHours = workingWeeks * inputs.billableHoursPerWeek;
    const neededRate = totalHours > 0 ? targetRev / totalHours : 0;
    results.push({
      label: 'Adjust Hourly Rate',
      description: `Charge ${formatCurrency(neededRate, 0)}/hr to earn ${formatCurrency(goalIncome, 0)}/yr`,
      change: m.hourlyRate > 0 ? ((neededRate - m.hourlyRate) / m.hourlyRate) * 100 : 0,
    });
    // Path 2: Increase billable hours
    const neededHours = targetRev > 0 ? targetRev / m.hourlyRate : 0;
    const neededHoursPerWeek = workingWeeks > 0 ? neededHours / workingWeeks : 0;
    results.push({
      label: 'Increase Billable Hours',
      description: `Bill ${neededHoursPerWeek.toFixed(1)} hrs/week at current rate`,
      change: inputs.billableHoursPerWeek > 0 ? ((neededHoursPerWeek - inputs.billableHoursPerWeek) / inputs.billableHoursPerWeek) * 100 : 0,
    });
    // Path 3: Reduce expenses
    const maxExpenses = (m.hourlyRate * totalHours) * (1 - inputs.profitMargin / 100) - goalIncome;
    results.push({
      label: 'Reduce Expenses',
      description: `Cut expenses to ${formatCurrency(Math.max(0, maxExpenses), 0)}/yr`,
      change: inputs.annualExpenses > 0 ? ((Math.max(0, maxExpenses) - inputs.annualExpenses) / inputs.annualExpenses) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — rate vs industry benchmarks
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];
  const industryRates = [
    { label: 'Marketing', rate: benchmarks.freelance.avg_hourly_rate_marketing },
    { label: 'Design', rate: benchmarks.freelance.avg_hourly_rate_design },
    { label: 'Development', rate: benchmarks.freelance.avg_hourly_rate_development },
    { label: 'Writing', rate: benchmarks.freelance.avg_hourly_rate_writing },
    { label: 'Consulting', rate: benchmarks.freelance.avg_hourly_rate_consulting },
  ];

  const chartData = {
    labels: ['Your Rate', ...industryRates.map(r => r.label)],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.hourlyRate, ...industryRates.map(r => r.rate)],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        ...industryRates.map(() => idx === 0 ? '#64748B80' : 'transparent'),
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
            return `${ctx.dataset.label}: $${(v ?? 0).toFixed(0)}/hr`;
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
    if (m.hourlyRate < 30) {
      return {
        status: 'danger',
        title: `Your rate of ${formatCurrency(m.hourlyRate, 0)}/hr is dangerously low — you may not cover your costs.`,
        actions: [
          {
            icon: '🚨',
            text: 'Your rate is below sustainable levels. Increase your income target or reduce expenses immediately.',
            affiliateText: 'Find higher-paying clients with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📉', text: 'Cut non-essential expenses and audit your tool subscriptions to lower your cost baseline.' },
          { icon: '⏰', text: 'Increase billable hours or reduce PTO temporarily to bring your rate into a sustainable range.' },
        ],
      };
    }
    if (m.hourlyRate < 75) {
      return {
        status: 'warning',
        title: `Your rate of ${formatCurrency(m.hourlyRate, 0)}/hr is below the industry average for most specialties.`,
        actions: [
          { icon: '🎯', text: 'Specialize in a high-demand niche to justify premium pricing — generalists earn less.' },
          {
            icon: '📊',
            text: 'Build a portfolio of case studies with measurable results to support higher rates.',
            affiliateText: 'Research profitable niches with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '💼', text: 'Shift from hourly to value-based or project-based pricing to capture more of the value you create.', link: '/tools/client-profitability-calculator' },
        ],
      };
    }
    if (m.hourlyRate < 150) {
      return {
        status: 'good',
        title: `Your rate of ${formatCurrency(m.hourlyRate, 0)}/hr is competitive. You are in the solid mid-range for most specialties.`,
        actions: [
          { icon: '📈', text: 'Raise rates by 10-15% for new clients — existing rates often lag market value.' },
          {
            icon: '🔄',
            text: 'Add retainer agreements to stabilize income and reduce time spent on client acquisition.',
            affiliateText: 'Find premium clients with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🧪', text: 'Productize your services — create fixed-scope packages that are easier to sell and scale.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Your rate of ${formatCurrency(m.hourlyRate, 0)}/hr puts you in premium territory — you are earning at a top-tier level.`,
      actions: [
        {
          icon: '🚀',
          text: 'Consider building a team or subcontracting to scale beyond your personal billable hours.',
          affiliateText: 'Scale your agency with Semrush data → Try free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Create passive income streams — courses, templates, or digital products that leverage your expertise.' },
        { icon: '📧', text: 'Build a personal brand and content presence to attract inbound leads and eliminate cold outreach.', link: '/tools/newsletter-value-calculator' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Freelance Rate Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate your ideal freelance hourly rate based on your income goals, business
          expenses, and available billable hours. Compare scenarios, benchmark against
          industry rates, and share your analysis — all in real time.
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
            label="Desired Annual Income"
            value={inputs.desiredAnnualIncome}
            min={20000}
            max={500000}
            step={5000}
            prefix="$"
            onChange={(v) => update('desiredAnnualIncome', v)}
            benchmarkChips={[
              { label: '$60K', value: 60000 },
              { label: '$100K', value: 100000 },
              { label: '$150K', value: 150000 },
              { label: '$250K', value: 250000 },
            ]}
          />
          <ScenarioSlider
            label="Annual Business Expenses"
            value={inputs.annualExpenses}
            min={0}
            max={100000}
            step={500}
            prefix="$"
            benchmark={benchmarks.freelance.avg_annual_expenses}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('annualExpenses', v)}
          />
          <ScenarioSlider
            label="Billable Hours per Week"
            value={inputs.billableHoursPerWeek}
            min={5}
            max={50}
            step={1}
            benchmark={benchmarks.freelance.avg_billable_hours_per_week}
            benchmarkLabel="Industry avg"
            onChange={(v) => update('billableHoursPerWeek', v)}
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
                label="Weeks PTO / Year"
                value={inputs.weeksPTO}
                min={0}
                max={12}
                step={1}
                benchmark={benchmarks.freelance.avg_weeks_off}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('weeksPTO', v)}
              />
              <ScenarioSlider
                label="Profit Margin"
                value={inputs.profitMargin}
                min={0}
                max={60}
                step={1}
                suffix="%"
                benchmark={benchmarks.freelance.avg_project_profit_margin}
                benchmarkLabel="Industry avg"
                onChange={(v) => update('profitMargin', v)}
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
                title="Hourly Rate"
                value={formatCurrency(m.hourlyRate, 0)}
                subtitle={`${formatNumber(m.totalBillableHours)} billable hrs/yr`}
                color={m.hourlyRate >= 100 ? 'green' : m.hourlyRate >= 50 ? 'amber' : 'red'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Daily Rate (8hr)"
                value={formatCurrency(m.dailyRate, 0)}
                subtitle={`${m.workingWeeks} working weeks`}
                color="blue"
              />
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(m.monthlyRevenue, 0)}
                subtitle={`${formatCurrency(m.targetRevenue, 0)}/yr target`}
                color={m.monthlyRevenue >= 10000 ? 'green' : 'amber'}
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
                      <p className="text-[10px] text-muted uppercase">Hourly Rate</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.hourlyRate, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Daily Rate</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.dailyRate, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Monthly Revenue</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.monthlyRevenue, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="freelance-rate-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Your Rate vs. Industry Benchmarks</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Rate vs. Industry Average"
            value={m.hourlyRate}
            benchmark={benchmarks.freelance.avg_hourly_rate_marketing}
            min={0}
            max={300}
            suffix="/hr"
            prefix="$"
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Find higher-paying clients"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="freelance-rate-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Income — What rate do I need?
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Annual Income</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalIncome}
                onChange={(e) => setGoalIncome(parseFloat(e.target.value) || 0)}
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
          desiredAnnualIncome: 'Annual Income',
          annualExpenses: 'Expenses',
          weeksPTO: 'Weeks PTO',
          billableHoursPerWeek: 'Billable Hrs/Wk',
          profitMargin: 'Profit Margin',
        }}
        calculateFn={calcProfit}
        resultLabel="hourly rate"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">How to Calculate Your Freelance Rate</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Setting the right freelance rate is one of the most consequential decisions in your
            independent career. Charge too little and you burn out chasing hours to make ends meet.
            Charge too much without the positioning to back it up and you lose deals to competitors.
            The sweet spot sits at the intersection of your financial needs, market rates, and the
            value you deliver to clients. This calculator helps you find that number by working
            backward from your desired income.
          </p>
          <p>
            The formula starts with your desired take-home income, adds your annual business expenses
            (software, insurance, taxes, equipment, coworking, professional development), and then
            applies a profit margin on top. That profit margin is not greed — it is a buffer for slow
            months, unexpected expenses, and reinvestment in your business. The resulting target
            revenue is divided by your total billable hours per year (working weeks times billable
            hours per week) to arrive at your hourly rate.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Why Billable Hours Matter More Than You Think</h3>
          <p>
            Most freelancers dramatically overestimate their billable hours. A 40-hour work week does
            not mean 40 billable hours. Between client communication, proposals, invoicing, marketing,
            admin, and professional development, the industry average is around 30 billable hours per
            week. If you plug 40 hours into your rate calculation but only bill 30, you will earn 25%
            less than planned. This calculator uses realistic defaults based on industry data so your
            rate reflects what you will actually earn, not an optimistic fantasy.
          </p>
          <p>
            Weeks of paid time off also matter significantly. Taking just two extra weeks of vacation
            removes roughly 60 billable hours from your year. At $100/hour, that is $6,000 in lost
            revenue that your rate must absorb. The calculator automatically adjusts for PTO so you
            can plan vacations without guilt or financial surprise. To position yourself for premium
            rates, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush provides competitive intelligence that helps you identify high-value niches and clients willing to pay top rates</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Industry Rate Benchmarks</h3>
          <p>
            Freelance rates vary enormously by specialty. Marketing consultants average around $75/hour,
            graphic designers around $65/hour, software developers around $100/hour, freelance writers
            around $50/hour, and management consultants around $150/hour. These are averages — top
            performers in each category regularly charge 2-3x these rates. Your rate should reflect
            not just your specialty but your experience level, niche focus, geographic market, and the
            specific results you deliver.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Moving Beyond Hourly Pricing</h3>
          <p>
            While this calculator focuses on hourly rates as a benchmark, many successful freelancers
            eventually transition to value-based or project-based pricing. The hourly rate serves as
            your internal floor — the minimum you need per hour of work to meet your financial goals.
            When pricing projects, you can use this floor to ensure profitability while capturing
            additional value based on the outcomes you deliver. A marketing consultant who helps a
            client generate $500,000 in revenue can justify a $25,000 project fee even if it only
            takes 40 hours of work. For deeper market research to support your pricing strategy,
            <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline"> try Semrush to analyze what competitors charge and find underserved markets where you can command premium rates</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="freelance-rate-calculator" />
      <PreRelatedCTA toolSlug="freelance-rate-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="freelance-rate-calculator" />
    </div>
  );
}
