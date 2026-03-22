'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  audienceSize: 5000,
  coursePrice: 197,
  landingPageConversion: 5,
  emailSequenceConversion: 3,
  refundRate: 10,
  upsellRate: 15,
  upsellPrice: 97,
  affiliatePercent: 0,
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
    question: 'What is a good conversion rate for a course landing page?',
    answer: 'The average landing page conversion rate for online courses is around 5%, but well-optimized pages with strong social proof, compelling copy, and targeted traffic can achieve 10-15%. The key factors are message-market fit, the quality of your traffic source, urgency elements (limited-time pricing), and social proof (testimonials, student count, results).',
  },
  {
    question: 'How do I reduce course refund rates?',
    answer: 'Set clear expectations in your sales copy about what the course covers and who it is for. Provide a strong onboarding experience in the first 48 hours when most refund requests occur. Offer a specific, results-based guarantee rather than a no-questions-asked policy. Most importantly, deliver genuine value early \u2014 students who complete the first module rarely request refunds.',
  },
  {
    question: 'What is the best price point for an online course?',
    answer: 'The average online course price is around $197, but optimal pricing depends on your niche, audience, and the transformation you deliver. Courses solving specific, high-value problems (career skills, business growth) can command $497-2,000+. Mini-courses and introductory content work well at $27-97. Test pricing with small audience segments before committing to a launch price.',
  },
  {
    question: 'How important is an email sequence for course launches?',
    answer: 'Email sequences are critical \u2014 they typically generate 30-50% of total launch revenue. A well-crafted 5-7 email sequence builds anticipation, handles objections, and creates urgency. The average email conversion rate for course launches is around 3%, but segmented sequences targeting warm leads can achieve 5-10%. Always include a deadline and a clear reason to buy now.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const directSales = inp.audienceSize * (inp.landingPageConversion / 100);
  const emailSales = (inp.audienceSize - directSales) * (inp.emailSequenceConversion / 100);
  const totalEnrollments = directSales + emailSales;
  const grossRevenue = totalEnrollments * inp.coursePrice;
  const refunds = grossRevenue * (inp.refundRate / 100);
  const upsellRevenue = totalEnrollments * (inp.upsellRate / 100) * inp.upsellPrice;
  const affiliateCost = grossRevenue * (inp.affiliatePercent / 100);
  const netRevenue = grossRevenue - refunds + upsellRevenue - affiliateCost;
  const revenuePerLead = inp.audienceSize > 0 ? netRevenue / inp.audienceSize : 0;
  return { directSales, emailSales, totalEnrollments, grossRevenue, refunds, upsellRevenue, affiliateCost, netRevenue, revenuePerLead };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function CourseRevenueEstimatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState(50000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('course-revenue-estimator');
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
    saveToLocalStorage('course-revenue-estimator', inputs);
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
    const direct = (inp.audienceSize || 0) * ((inp.landingPageConversion || 0) / 100);
    const email = ((inp.audienceSize || 0) - direct) * ((inp.emailSequenceConversion || 0) / 100);
    const enrollments = direct + email;
    const gross = enrollments * (inp.coursePrice || 0);
    const refunds = gross * ((inp.refundRate || 0) / 100);
    const upsell = enrollments * ((inp.upsellRate || 0) / 100) * (inp.upsellPrice || 0);
    const affCost = gross * ((inp.affiliatePercent || 0) / 100);
    return gross - refunds + upsell - affCost;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Increase audience
    const currentRevenuePerLead = m.revenuePerLead > 0 ? m.revenuePerLead : 0.01;
    const neededAudience = Math.ceil(goalRevenue / currentRevenuePerLead);
    results.push({
      label: 'Grow Audience',
      description: `Build list to ${neededAudience.toLocaleString()} leads`,
      change: inputs.audienceSize > 0 ? ((neededAudience - inputs.audienceSize) / inputs.audienceSize) * 100 : 0,
    });
    // Path 2: Increase landing page conversion
    const enrollmentsNeeded = inputs.coursePrice > 0 ? goalRevenue / inputs.coursePrice : 0;
    const neededLPConversion = inputs.audienceSize > 0 ? (enrollmentsNeeded / inputs.audienceSize) * 100 : 0;
    results.push({
      label: 'Improve Landing Page',
      description: `Conversion to ${neededLPConversion.toFixed(1)}%`,
      change: inputs.landingPageConversion > 0 ? ((neededLPConversion - inputs.landingPageConversion) / inputs.landingPageConversion) * 100 : 0,
    });
    // Path 3: Increase price
    const neededPrice = m.totalEnrollments > 0 ? goalRevenue / m.totalEnrollments : 0;
    results.push({
      label: 'Raise Course Price',
      description: `Increase price to ${formatCurrency(neededPrice)}`,
      change: inputs.coursePrice > 0 ? ((neededPrice - inputs.coursePrice) / inputs.coursePrice) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data - funnel stages
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Audience', 'LP Conversions', 'Email Sales', 'Total Enrolled', 'Upsell Buyers'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [
        s.inputs.audienceSize,
        s.metrics.directSales,
        s.metrics.emailSales,
        s.metrics.totalEnrollments,
        s.metrics.totalEnrollments * (s.inputs.upsellRate / 100),
      ],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}99`,
        `${scenarioColors[idx]}80`,
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}66`,
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
            return `${ctx.dataset.label}: ${Math.round(v ?? 0).toLocaleString()}`;
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
    if (m.netRevenue < 1000) {
      return {
        status: 'danger',
        title: `Net revenue of ${formatCurrency(m.netRevenue)} is too low for a viable course launch.`,
        actions: [
          {
            icon: '\u{1F4E7}',
            text: 'Build a larger email list before launching \u2014 most successful launches need 2,000+ engaged subscribers minimum.',
            affiliateText: 'Build your launch page with Unbounce',
            affiliateUrl: affiliateData.partners.unbounce.url,
          },
          { icon: '\u{1F4B0}', text: 'Validate your price point \u2014 survey your audience to find the maximum they would pay for the transformation your course delivers.' },
          { icon: '\u{1F3AF}', text: 'Improve your landing page conversion \u2014 test headlines, social proof, and urgency elements.' },
        ],
      };
    }
    if (m.netRevenue < 10000) {
      return {
        status: 'warning',
        title: `Net revenue of ${formatCurrency(m.netRevenue)} \u2014 a modest launch. Focus on conversion optimization.`,
        actions: [
          { icon: '\u{1F4CA}', text: 'A/B test your landing page \u2014 even a 1% conversion improvement significantly impacts revenue at your audience size.' },
          {
            icon: '\u{1F4E7}',
            text: 'Optimize your email sequence \u2014 add urgency, testimonials, and FAQ-style objection handling.',
            link: '/tools/email-roi-calculator',
            affiliateText: 'Build high-converting landing pages with Unbounce',
            affiliateUrl: affiliateData.partners.unbounce.url,
          },
          { icon: '\u{1F504}', text: 'Add a downsell \u2014 offer a payment plan or mini-course for prospects who do not buy the main offer.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    if (m.netRevenue < 50000) {
      return {
        status: 'good',
        title: `Net revenue of ${formatCurrency(m.netRevenue)} \u2014 a strong launch. Optimize for maximum revenue.`,
        actions: [
          { icon: '\u{1F680}', text: 'Scale your audience \u2014 invest in paid ads to your landing page now that conversion rates are proven.' },
          {
            icon: '\u{1F4E6}',
            text: 'Launch a premium upsell \u2014 coaching, community access, or certification can significantly increase revenue per student.',
            affiliateText: 'Optimize your sales page with Unbounce',
            affiliateUrl: affiliateData.partners.unbounce.url,
          },
          { icon: '\u{1F91D}', text: 'Launch an affiliate program \u2014 offer 30-40% commissions to incentivize partners to promote your course.' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Net revenue of ${formatCurrency(m.netRevenue)} \u2014 an exceptional launch projection.`,
      actions: [
        {
          icon: '\u{1F310}',
          text: 'Consider an evergreen funnel \u2014 convert your launch into an always-on sales machine for consistent monthly revenue.',
          affiliateText: 'Build an evergreen funnel with Unbounce',
          affiliateUrl: affiliateData.partners.unbounce.url,
        },
        { icon: '\u{1F4DA}', text: 'Create a course suite \u2014 use your flagship course as the foundation for a premium ecosystem of products.' },
        { icon: '\u{1F48E}', text: 'Add high-ticket group coaching or mastermind offers for students who want deeper transformation.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Course Launch Revenue Estimator</h1>
        <p className="text-label max-w-2xl">
          Estimate your course launch revenue by modeling your audience size, landing page
          and email conversion rates, refunds, and upsells. Compare pricing strategies
          side by side and benchmark against industry averages.
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
            <button onClick={resetDefaults} className="text-xs text-muted hover:text-label transition-colors ml-auto">Reset</button>
          </div>

          {/* Basic Inputs */}
          <ScenarioSlider label="Audience / List Size" value={inputs.audienceSize} min={100} max={500000} step={100} onChange={(v) => update('audienceSize', v)} benchmarkChips={[{ label: '1K', value: 1000 }, { label: '5K', value: 5000 }, { label: '10K', value: 10000 }, { label: '50K', value: 50000 }, { label: '100K', value: 100000 }]} />
          <ScenarioSlider label="Course Price" value={inputs.coursePrice} min={9} max={5000} step={1} prefix="$" onChange={(v) => update('coursePrice', v)} benchmarkChips={[{ label: '$47', value: 47 }, { label: '$97', value: 97 }, { label: '$197', value: 197 }, { label: '$497', value: 497 }, { label: '$997', value: 997 }]} />
          <ScenarioSlider label="Landing Page Conversion" value={inputs.landingPageConversion} min={0.1} max={30} step={0.1} suffix="%" benchmark={benchmarks.course_launches.avg_landing_page_conversion} benchmarkLabel="Industry avg" onChange={(v) => update('landingPageConversion', v)} />

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover mt-2 mb-3 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider label="Email Sequence Conversion" value={inputs.emailSequenceConversion} min={0.1} max={20} step={0.1} suffix="%" benchmark={benchmarks.course_launches.avg_email_conversion} benchmarkLabel="Industry avg" onChange={(v) => update('emailSequenceConversion', v)} />
              <ScenarioSlider label="Refund Rate" value={inputs.refundRate} min={0} max={50} step={0.5} suffix="%" benchmark={benchmarks.course_launches.avg_refund_rate} benchmarkLabel="Industry avg" onChange={(v) => update('refundRate', v)} />
              <ScenarioSlider label="Upsell Rate" value={inputs.upsellRate} min={0} max={50} step={0.5} suffix="%" benchmark={benchmarks.course_launches.avg_upsell_rate} benchmarkLabel="Industry avg" onChange={(v) => update('upsellRate', v)} />
              <ScenarioSlider label="Upsell Price" value={inputs.upsellPrice} min={1} max={2000} step={1} prefix="$" onChange={(v) => update('upsellPrice', v)} />
              <ScenarioSlider label="Affiliate Commission" value={inputs.affiliatePercent} min={0} max={50} step={1} suffix="%" onChange={(v) => update('affiliatePercent', v)} benchmarkChips={[{ label: '0%', value: 0 }, { label: '20%', value: 20 }, { label: '30%', value: 30 }, { label: '40%', value: 40 }, { label: '50%', value: 50 }]} />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Net Revenue" value={formatCurrency(m.netRevenue)} subtitle={`Gross: ${formatCurrency(m.grossRevenue)}`} color={m.netRevenue > 0 ? 'green' : 'red'} />
              <KPICard title="Total Enrollments" value={formatNumber(Math.round(m.totalEnrollments))} subtitle={`${Math.round(m.directSales)} direct + ${Math.round(m.emailSales)} email`} color={m.totalEnrollments >= 100 ? 'green' : m.totalEnrollments >= 20 ? 'amber' : 'blue'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Revenue / Lead" value={formatCurrency(m.revenuePerLead, 2)} subtitle={`${inputs.audienceSize.toLocaleString()} total leads`} color="blue" />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Net Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.netRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Enrollments</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.totalEnrollments >= 100 ? 'text-success' : 'text-danger'}`}>{Math.round(s.metrics.totalEnrollments).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Rev/Lead</p>
                      <p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.revenuePerLead, 2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="course-revenue-estimator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Launch Funnel Breakdown</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge label="Your LP Conversion vs. Industry Average" value={inputs.landingPageConversion} benchmark={benchmarks.course_launches.avg_landing_page_conversion} min={0} max={30} suffix="%" affiliateUrl={affiliateData.partners.unbounce.url} affiliateText="Build your course sales page" />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="course-revenue-estimator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Revenue &mdash; How to reach your launch revenue goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Net Revenue</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input type="number" value={goalRevenue} onChange={(e) => setGoalRevenue(parseFloat(e.target.value) || 0)} className="bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 font-mono text-foreground w-40 outline-none focus:border-accent" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {reverseScenarios.map((scenario, i) => (
              <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'border-accent/30 bg-accent/5' : 'border-surface-lighter bg-surface-light'}`}>
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
          <button onClick={() => setIsReverse(false)} className="mt-4 text-xs text-muted hover:text-label">Close reverse mode</button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar inputs={inputs} labels={{ audienceSize: 'Audience Size', coursePrice: 'Course Price', landingPageConversion: 'LP Conversion', emailSequenceConversion: 'Email Conv.', refundRate: 'Refund Rate', upsellRate: 'Upsell Rate', upsellPrice: 'Upsell Price', affiliatePercent: 'Affiliate %' }} calculateFn={calcProfit} resultLabel="net revenue" />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Course Launch Revenue</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Online course launches follow a predictable funnel: audience to landing page to email
            sequence to enrollment. Each stage has a conversion rate that determines how many
            people progress to the next step, and optimizing each stage compounds across the
            entire funnel. This calculator models the full launch funnel &mdash; from audience size
            through landing page and email conversions to enrollments, refunds, upsells, and
            affiliate costs &mdash; so you can project net revenue with realistic assumptions.
          </p>
          <p>
            The average course landing page converts at approximately 5%, meaning for every 100
            visitors, five will purchase. But this average masks enormous variation. Pages with
            strong social proof, compelling transformation stories, and urgency elements can
            achieve 10-15%, while generic pages with weak copy may convert at 1-2%. The difference
            between a 3% and 8% landing page conversion rate can mean tens of thousands of dollars
            in additional revenue on a single launch.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">The Role of Email in Course Launches</h3>
          <p>
            Email sequences are the second conversion engine in a course launch, capturing
            prospects who visited the landing page but did not immediately purchase. A well-crafted
            5-7 email sequence handles objections, builds urgency, and provides social proof to
            convert fence-sitters. The industry average email conversion rate for course launches
            is around 3%, but segmented, personalized sequences can achieve much higher. To build high-converting course sales pages that maximize your landing page conversion rate, <a href={affiliateData.partners.unbounce.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Unbounce lets you build and A/B test landing pages without code, with AI-powered conversion optimization</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Revenue with Upsells</h3>
          <p>
            Upsells are the most efficient way to increase launch revenue because they target
            your warmest audience &mdash; people who have already purchased. The average upsell conversion
            rate is approximately 15%, and even a modest $97 upsell (coaching call, bonus module,
            community access) adds significant revenue at zero marginal acquisition cost. The best
            upsells offer a natural extension of the core course transformation, making it easy for
            students to say yes. For optimizing your upsell and order bump pages, <a href={affiliateData.partners.unbounce.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Unbounce&apos;s conversion-focused page builder to test different offers and maximize upsell revenue</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Managing Refunds and Expectations</h3>
          <p>
            The average course refund rate is around 10%, though this varies widely based on
            price point, guarantee terms, and course quality. Higher-priced courses tend to have
            lower refund rates because buyers are more intentional. The key to minimizing refunds
            is setting accurate expectations in your sales copy and delivering strong value in
            the first module &mdash; most refund requests come within the first 48 hours before students
            engage deeply with the content.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="course-revenue-estimator" />
      <PreRelatedCTA toolSlug="course-revenue-estimator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="course-revenue-estimator" />
    </div>
  );
}
