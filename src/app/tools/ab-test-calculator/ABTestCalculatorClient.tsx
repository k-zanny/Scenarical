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
import { formatNumber, saveToLocalStorage, loadFromLocalStorage } from '@/lib/utils';
import benchmarks from '@/data/benchmarks.json';
import PostKPICTA from '@/components/PostKPICTA';
import PreRelatedCTA from '@/components/PreRelatedCTA';
import affiliateData from '@/data/affiliate-links.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ------------------------------------------------------------------ */
/*  Normal inverse approximation (Rational approximation, Abramowitz   */
/*  & Stegun 26.2.23). Accurate to ~4.5e-4 for 0.5 < p < 1.          */
/* ------------------------------------------------------------------ */
function normalInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.5) return -normalInverse(1 - p);

  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

/* ------------------------------------------------------------------ */
/*  Normal CDF approximation (for power curve)                         */
/* ------------------------------------------------------------------ */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/* ------------------------------------------------------------------ */
/*  Calculate sample size per variation                                */
/* ------------------------------------------------------------------ */
function calcSampleSize(
  baselineRate: number,
  mdeRelative: number,
  confidence: number,
  power: number,
): number {
  const p1 = baselineRate / 100;
  const p2 = p1 * (1 + mdeRelative / 100);
  if (p2 <= p1 || p1 <= 0 || p2 >= 1) return Infinity;

  const zAlpha = normalInverse(1 - (1 - confidence / 100) / 2);
  const zBeta = normalInverse(power / 100);

  const numerator = Math.pow(zAlpha + zBeta, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}

/* ------------------------------------------------------------------ */
/*  Calculate achieved power for a given sample size                   */
/* ------------------------------------------------------------------ */
function calcPower(
  baselineRate: number,
  mdeRelative: number,
  confidence: number,
  n: number,
): number {
  const p1 = baselineRate / 100;
  const p2 = p1 * (1 + mdeRelative / 100);
  if (p2 <= p1 || p1 <= 0 || p2 >= 1 || n <= 0) return 0;

  const zAlpha = normalInverse(1 - (1 - confidence / 100) / 2);
  const se = Math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n);
  const zStat = (p2 - p1) / se;
  const powerVal = normalCDF(zStat - zAlpha);
  return Math.min(Math.max(powerVal * 100, 0), 100);
}

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  baselineConversion: 3.0,
  minimumDetectableEffect: 10,
  confidenceLevel: 95,
  statisticalPower: 80,
  dailyTraffic: 5000,
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
    question: 'How do I decide on the minimum detectable effect (MDE)?',
    answer: 'The MDE is the smallest relative improvement you care about detecting. For example, a 10% MDE on a 3% baseline means you want to detect a lift from 3.0% to 3.3%. Smaller MDEs require larger sample sizes. Choose an MDE that represents a business-meaningful improvement — if a 5% relative lift would not change your decision, use a larger MDE to save time.',
  },
  {
    question: 'What confidence level should I use for my A/B test?',
    answer: 'The industry standard is 95% confidence, which means a 5% false positive rate. Use 90% for faster exploratory tests where some risk of a false positive is acceptable. Use 99% for high-stakes decisions like pricing changes or checkout flow modifications where a wrong call has significant financial impact.',
  },
  {
    question: 'What is statistical power and why does 80% matter?',
    answer: 'Statistical power is the probability that your test will detect a real effect when one exists. At 80% power, there is a 20% chance you will miss a genuine improvement (a false negative). 80% is the standard convention. Increase to 90% for critical tests — but note this can increase required sample size by 30% or more.',
  },
  {
    question: 'Can I run the test for fewer days if I have higher traffic?',
    answer: 'Yes — higher daily traffic directly reduces test duration because you reach the required sample size faster. However, never stop a test early just because results look significant. Running for at least one full business cycle (typically 7 days) is recommended to account for day-of-week effects in user behavior.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const samplePerVariation = calcSampleSize(
    inp.baselineConversion,
    inp.minimumDetectableEffect,
    inp.confidenceLevel,
    inp.statisticalPower,
  );
  const totalSample = samplePerVariation * 2;
  const daysNeeded = inp.dailyTraffic > 0 ? totalSample / inp.dailyTraffic : Infinity;
  const p1 = inp.baselineConversion / 100;
  const p2 = p1 * (1 + inp.minimumDetectableEffect / 100);
  const absoluteEffect = (p2 - p1) * 100;
  return { samplePerVariation, totalSample, daysNeeded, p1, p2, absoluteEffect };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function ABTestCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalDays, setGoalDays] = useState(14);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  /* Load saved state & URL params ----------------------------------- */
  useEffect(() => {
    const saved = loadFromLocalStorage('ab-test-calculator');
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

  /* Persist to localStorage ----------------------------------------- */
  useEffect(() => {
    saveToLocalStorage('ab-test-calculator', inputs);
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

  /* Core calculations ----------------------------------------------- */
  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs) }));
  const m = computeMetrics(inputs);

  /* Reverse goal mode: required daily traffic for target days ------- */
  const reverseTraffic = goalDays > 0 ? Math.ceil(m.totalSample / goalDays) : Infinity;

  /* Power curve chart data ------------------------------------------ */
  const samplePoints = Array.from({ length: 16 }, (_, i) => {
    const fraction = 0.5 + i * 0.1;
    return Math.round(m.samplePerVariation * fraction);
  });

  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartDatasets = allMetrics.map((s, idx) => ({
    label: s.label,
    data: samplePoints.map(n =>
      calcPower(s.inputs.baselineConversion, s.inputs.minimumDetectableEffect, s.inputs.confidenceLevel, n),
    ),
    borderColor: scenarioColors[idx],
    backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    fill: idx === 0,
    tension: 0.3,
    pointRadius: 2,
    borderDash: idx > 0 ? [6, 3] : [],
  }));

  chartDatasets.push({
    label: `Target Power (${inputs.statisticalPower}%)`,
    data: samplePoints.map(() => inputs.statisticalPower),
    borderColor: '#F59E0B',
    backgroundColor: 'transparent',
    fill: false,
    tension: 0,
    pointRadius: 0,
    borderDash: [5, 5],
  });

  const chartData = {
    labels: samplePoints.map(n => formatNumber(n)),
    datasets: chartDatasets,
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
            `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: { color: '#94A3B8', maxRotation: 45 },
        title: { display: true, text: 'Sample Size Per Variation', color: '#94A3B8' },
      },
      y: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#94A3B8', callback: (v: any) => `${v}%` },
        title: { display: true, text: 'Statistical Power', color: '#94A3B8' },
        min: 0,
        max: 100,
      },
    },
  };

  /* RiskRadar calc function ----------------------------------------- */
  const calcDays = useCallback((inp: Record<string, number>) => {
    const n = calcSampleSize(
      inp.baselineConversion || 3,
      inp.minimumDetectableEffect || 10,
      inp.confidenceLevel || 95,
      inp.statisticalPower || 80,
    );
    const traffic = inp.dailyTraffic || 5000;
    return -(n * 2) / traffic; // negative because fewer days is better
  }, []);

  /* Action panel ---------------------------------------------------- */
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    if (m.daysNeeded > 90) {
      return {
        status: 'danger',
        title: `Test would take ${Math.ceil(m.daysNeeded)} days — over 3 months. Consider increasing MDE or traffic.`,
        actions: [
          { icon: '📈', text: 'Increase MDE — detect only larger effects to reduce required sample size.' },
          {
            icon: '🚦',
            text: 'Drive more traffic — use paid ads or email campaigns to boost daily visitors.',
            link: '/tools/ad-budget-planner',
            affiliateText: 'Boost traffic with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🎯', text: 'Focus on pages with higher traffic volume for faster results.' },
        ],
      };
    }
    if (m.daysNeeded > 30) {
      return {
        status: 'warning',
        title: `Test duration of ${Math.ceil(m.daysNeeded)} days is feasible but long. Watch for seasonal effects.`,
        actions: [
          { icon: '📊', text: 'Ensure test spans full business cycles to avoid day-of-week bias.' },
          { icon: '🔍', text: 'Consider a larger MDE if small effects are not business-critical.' },
          {
            icon: '📧',
            text: 'Use email campaigns to increase traffic during the test period.',
            link: '/tools/email-roi-calculator',
            affiliateText: 'Analyze traffic sources with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
        ],
      };
    }
    if (inputs.minimumDetectableEffect > 20) {
      return {
        status: 'warning',
        title: `MDE of ${inputs.minimumDetectableEffect}% is large — you may miss smaller but meaningful improvements.`,
        actions: [
          { icon: '🔬', text: 'Consider a smaller MDE (5-10%) to detect subtler effects.' },
          { icon: '⏱️', text: 'A smaller MDE takes more time but gives more precise insights.' },
          {
            icon: '📊',
            text: 'Use this calculator to find the sweet spot between speed and precision.',
            affiliateText: 'Track experiment results with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
        ],
      };
    }
    if (m.daysNeeded <= 14) {
      return {
        status: 'excellent',
        title: `Test can complete in ${Math.ceil(m.daysNeeded)} days — excellent turnaround time.`,
        actions: [
          { icon: '🚀', text: 'Consider testing a smaller MDE for even more precision.' },
          {
            icon: '🧪',
            text: 'Run multiple sequential tests to optimize faster.',
            link: '/tools/landing-page-estimator',
            affiliateText: 'Find winning pages with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📊', text: 'Track your ROAS to ensure test winners actually improve revenue.', link: '/tools/roas-calculator' },
        ],
      };
    }
    return {
      status: 'good',
      title: `Test duration of ${Math.ceil(m.daysNeeded)} days is within a healthy range.`,
      actions: [
        { icon: '✅', text: 'Run for at least 7 days regardless of sample size to capture weekly patterns.' },
        { icon: '📈', text: 'Track conversion rate trends during the test to catch any anomalies.' },
        {
          icon: '🎯',
          text: 'Ensure your traffic split is truly 50/50 for accurate results.',
          affiliateText: 'Monitor traffic quality with Semrush → Try free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">A/B Test Sample Size Calculator</h1>
        <p className="text-label max-w-2xl">
          This A/B Test Calculator helps you determine the exact sample size needed for statistically
          significant experiments. Drag sliders to simulate different test parameters, see how your
          baseline compares to industry benchmarks, and share your test plan with your team — all in
          real time.
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
            label="Baseline Conversion Rate"
            value={inputs.baselineConversion}
            min={0.1}
            max={50}
            step={0.1}
            suffix="%"
            benchmark={benchmarks.landing_pages.avg_conversion_rate}
            benchmarkLabel="Landing page avg"
            onChange={(v) => update('baselineConversion', v)}
            benchmarkChips={[
              { label: 'eComm 3%', value: 3 },
              { label: 'SaaS 7%', value: 7 },
              { label: 'Lead Gen 12%', value: 12 },
            ]}
          />
          <ScenarioSlider
            label="Minimum Detectable Effect (MDE)"
            value={inputs.minimumDetectableEffect}
            min={1}
            max={50}
            step={1}
            suffix="%"
            onChange={(v) => update('minimumDetectableEffect', v)}
          />
          <ScenarioSlider
            label="Daily Traffic (Visitors)"
            value={inputs.dailyTraffic}
            min={100}
            max={1000000}
            step={100}
            onChange={(v) => update('dailyTraffic', v)}
            benchmarkChips={[
              { label: '1K', value: 1000 },
              { label: '5K', value: 5000 },
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
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
                label="Confidence Level"
                value={inputs.confidenceLevel}
                min={80}
                max={99}
                step={1}
                suffix="%"
                onChange={(v) => update('confidenceLevel', v)}
              />
              <ScenarioSlider
                label="Statistical Power"
                value={inputs.statisticalPower}
                min={50}
                max={99}
                step={1}
                suffix="%"
                onChange={(v) => update('statisticalPower', v)}
              />
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-surface-light border border-surface-lighter">
            <p className="text-xs text-muted">
              Detecting a <span className="text-foreground font-medium">{inputs.minimumDetectableEffect}%</span> relative lift
              means going from <span className="text-foreground font-medium">{inputs.baselineConversion.toFixed(2)}%</span> to{' '}
              <span className="text-foreground font-medium">{(m.p2 * 100).toFixed(2)}%</span> (absolute
              change: {m.absoluteEffect.toFixed(3)} pp).
            </p>
          </div>
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {/* KPI Cards — show comparison if multiple scenarios */}
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard
                title="Per Variation"
                value={formatNumber(isFinite(m.samplePerVariation) ? m.samplePerVariation : 0)}
                subtitle="visitors needed"
                color="blue"
              />
              <KPICard
                title="Total Sample"
                value={formatNumber(isFinite(m.totalSample) ? m.totalSample : 0)}
                subtitle="both variations"
                color="blue"
              />
              <KPICard
                title="Days to Complete"
                value={isFinite(m.daysNeeded) ? Math.ceil(m.daysNeeded).toString() : '--'}
                subtitle={isFinite(m.daysNeeded) ? `${formatNumber(inputs.dailyTraffic)}/day` : 'insufficient traffic'}
                color={m.daysNeeded <= 14 ? 'green' : m.daysNeeded <= 30 ? 'amber' : 'red'}
                clickable
                onGoalSubmit={(v) => {
                  setIsReverse(true);
                  setGoalDays(v);
                }}
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
                      <p className="text-[10px] text-muted uppercase">Per Variation</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatNumber(isFinite(s.metrics.samplePerVariation) ? s.metrics.samplePerVariation : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Total Sample</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatNumber(isFinite(s.metrics.totalSample) ? s.metrics.totalSample : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Days</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.daysNeeded <= 14 ? 'text-success' : s.metrics.daysNeeded <= 30 ? 'text-warning' : 'text-danger'}`}>
                        {isFinite(s.metrics.daysNeeded) ? Math.ceil(s.metrics.daysNeeded) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="ab-test-calculator" />

          {/* Chart — bigger height */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Statistical Power Curve</h3>
            <div className="h-80 sm:h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Baseline vs. Landing Page Average"
            value={inputs.baselineConversion}
            benchmark={benchmarks.landing_pages.avg_conversion_rate}
            min={0}
            max={15}
            suffix="%"
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Drive more test traffic"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="ab-test-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* Reverse Goal Mode */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Reverse Goal Mode — Set your target test duration
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Days</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={goalDays}
                onChange={(e) => setGoalDays(parseFloat(e.target.value) || 1)}
                className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-32 outline-none focus:border-accent"
                min={1}
              />
              <span className="text-label text-sm">days</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5">
              <h4 className="text-sm font-semibold text-foreground">Required Daily Traffic</h4>
              <p className="text-2xl font-bold text-accent mt-1">
                {formatNumber(isFinite(reverseTraffic) ? reverseTraffic : 0)}
              </p>
              <p className="text-xs text-label mt-1">
                visitors per day to complete in {goalDays} days
              </p>
            </div>
            <div className="p-4 rounded-xl border border-surface-lighter bg-surface-light">
              <h4 className="text-sm font-semibold text-foreground">Traffic Gap</h4>
              <p className="text-2xl font-bold mt-1">
                {reverseTraffic > inputs.dailyTraffic ? (
                  <span className="text-danger">
                    +{formatNumber(reverseTraffic - inputs.dailyTraffic)}
                  </span>
                ) : (
                  <span className="text-success">
                    Current traffic is sufficient
                  </span>
                )}
              </p>
              <p className="text-xs text-label mt-1">
                {reverseTraffic > inputs.dailyTraffic
                  ? 'additional daily visitors needed'
                  : `you have ${formatNumber(inputs.dailyTraffic - reverseTraffic)} visitors to spare`}
              </p>
            </div>
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
          baselineConversion: 'Baseline Rate',
          minimumDetectableEffect: 'MDE',
          confidenceLevel: 'Confidence',
          statisticalPower: 'Power',
          dailyTraffic: 'Daily Traffic',
        }}
        calculateFn={calcDays}
        resultLabel="days to complete"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          A/B Test Sample Size: The Complete Guide
        </h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Running an A/B test without calculating sample size is one of the most common — and
            costly — mistakes in conversion rate optimization. End a test too early and you risk
            acting on noise instead of signal. Run it too long and you waste weeks that could have
            been spent shipping improvements. This calculator gives you the exact number of visitors
            you need before you launch your experiment, so you can plan with confidence instead of
            guessing.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
            How A/B Test Sample Size Is Calculated
          </h3>
          <p>
            The sample size formula is rooted in frequentist hypothesis testing. You start with two
            conversion rates: your current baseline (the control) and the expected rate after the
            change (the variant). The difference between these two rates is driven by your Minimum
            Detectable Effect (MDE) — the smallest relative improvement you want the test to be able
            to detect.
          </p>
          <p>
            Two Z-scores determine the required sample size. The first, Z-alpha, comes from your
            confidence level. At 95% confidence (the industry standard), Z-alpha is 1.96, meaning
            you accept a 5% false-positive risk. The second, Z-beta, comes from your desired
            statistical power. At 80% power, Z-beta is 0.8416, meaning you accept a 20% chance of
            missing a real effect. The formula combines these Z-scores with the variance of both
            conversion rates to determine the minimum observations per variation.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
            Choosing the Right Minimum Detectable Effect
          </h3>
          <p>
            The MDE is the single most influential parameter on your sample size. A 5% relative MDE
            on a 3% baseline conversion rate means you want to detect a lift from 3.0% to 3.15% —
            an absolute change of just 0.15 percentage points. Detecting such a small shift requires
            a massive sample. A 20% MDE (3.0% to 3.6%) is much easier to detect and requires
            roughly 16 times fewer visitors.
          </p>
          <p>
            The key question is: what is the smallest improvement worth acting on? If a 5% lift
            would generate $50,000 in annual revenue, it is worth the patience. If it would generate
            $500, use a larger MDE and run shorter tests. This calculator shows you the exact
            trade-off so you can make an informed decision. To find pages with the highest traffic potential, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Semrush&apos;s traffic analytics can help you identify which pages have enough volume for rapid testing</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
            Confidence Level vs. Statistical Power
          </h3>
          <p>
            Confidence level controls your false-positive rate (Type I error) — the probability of
            declaring a winner when there is no real difference. Statistical power controls your
            false-negative rate (Type II error) — the probability of missing a real winner. These
            two parameters work in tension: increasing either one raises the required sample size.
          </p>
          <p>
            The standard combination of 95% confidence and 80% power is appropriate for most
            business decisions. For high-stakes tests — pricing changes, checkout redesigns, or
            anything with significant revenue impact — consider 99% confidence and 90% power. For
            low-risk exploratory tests, 90% confidence and 80% power can cut your required sample
            by nearly half.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
            How to Use This Calculator
          </h3>
          <p>
            Start by entering your current conversion rate as the baseline. Set the MDE to the
            smallest relative improvement you care about — 10% is a common starting point. Adjust
            confidence and power if needed, then enter your daily traffic to see how many days the
            test will take. Use the power curve chart to understand how sample size affects your
            ability to detect real effects.
          </p>
          <p>
            If the test duration is too long, use the interactive sliders to explore trade-offs.
            The Risk Radar shows which variable has the biggest impact on test duration, helping you
            focus your attention. Click &quot;Days to Complete&quot; to enter reverse-goal mode, where you set
            a target duration and the calculator tells you the daily traffic needed to meet it. If your current traffic is too low for fast experiments, <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Semrush&apos;s organic research tools to find high-traffic opportunities</a>.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">
            Common Pitfalls to Avoid
          </h3>
          <p>
            Never stop a test early because p-values look promising. Statistical significance
            fluctuates during a test, and early stopping inflates false-positive rates dramatically.
            Always run for the full calculated duration. Also ensure your test runs for at least one
            full week to capture day-of-week effects — even if your sample size is reached in three
            days.
          </p>
          <p>
            Watch out for the &quot;peeking problem.&quot; Every time you check results mid-test and consider
            stopping, you effectively run a new hypothesis test. Some testing platforms offer
            sequential testing methods that account for peeking, but the standard fixed-horizon
            approach used here assumes you check results only once — at the end.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="ab-test-calculator" />
      {/* Related Tools */}
      <PreRelatedCTA toolSlug="ab-test-calculator" />
      <RelatedTools currentSlug="ab-test-calculator" />
    </div>
  );
}
