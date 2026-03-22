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
  downloadsPerEpisode: 1000,
  episodesPerMonth: 4,
  sponsorCPM: 25,
  sponsorFillRate: 60,
  premiumSubscribers: 50,
  premiumPrice: 5,
  productionCostPerEpisode: 200,
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
    question: 'How many downloads do I need to monetize a podcast?',
    answer: 'Most podcast advertising networks require a minimum of 5,000-10,000 downloads per episode to join their marketplace. However, you can monetize with fewer downloads through direct sponsor outreach, premium content subscriptions, or affiliate partnerships. Niche podcasts with highly engaged audiences can command premium CPM rates even with smaller download numbers.',
  },
  {
    question: 'What is a good CPM rate for podcast advertising?',
    answer: 'The industry average CPM for podcast ads is around $25 for a mid-roll placement. Pre-roll ads typically command $18-20 CPM, while host-read mid-roll ads in niche categories can reach $50-80 CPM. The key factors are audience engagement, niche specificity, and whether the ad is host-read vs. dynamically inserted.',
  },
  {
    question: 'How do I increase my podcast download numbers?',
    answer: 'Focus on consistency (regular release schedule), discoverability (SEO-optimized titles and descriptions), cross-promotion (guest on other podcasts), and audience retention (engage on social media, build an email list). Converting listeners to newsletter subscribers creates a direct channel for promoting new episodes and driving repeat downloads.',
  },
  {
    question: 'Is premium podcast content worth offering?',
    answer: 'Premium content (bonus episodes, ad-free versions, early access) can be highly profitable because it generates recurring revenue independent of download numbers. Even converting 3-5% of your audience to paying subscribers at $5/month creates meaningful income. The key is offering genuine additional value \u2014 not just gating existing free content.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const monthlyDownloads = inp.downloadsPerEpisode * inp.episodesPerMonth;
  const sponsorRevenue = (monthlyDownloads / 1000) * inp.sponsorCPM * (inp.sponsorFillRate / 100);
  const premiumRevenue = inp.premiumSubscribers * inp.premiumPrice;
  const totalRevenue = sponsorRevenue + premiumRevenue;
  const totalCosts = inp.productionCostPerEpisode * inp.episodesPerMonth;
  const profit = totalRevenue - totalCosts;
  const revenuePerEpisode = inp.episodesPerMonth > 0 ? totalRevenue / inp.episodesPerMonth : 0;
  const revenuePerDownload = monthlyDownloads > 0 ? totalRevenue / monthlyDownloads : 0;
  return { monthlyDownloads, sponsorRevenue, premiumRevenue, totalRevenue, totalCosts, profit, revenuePerEpisode, revenuePerDownload };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function PodcastRevenueCalculatorClient() {
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
    const saved = loadFromLocalStorage('podcast-revenue-calculator');
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
    saveToLocalStorage('podcast-revenue-calculator', inputs);
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
    const downloads = (inp.downloadsPerEpisode || 0) * (inp.episodesPerMonth || 0);
    const sponsor = (downloads / 1000) * (inp.sponsorCPM || 0) * ((inp.sponsorFillRate || 0) / 100);
    const premium = (inp.premiumSubscribers || 0) * (inp.premiumPrice || 0);
    const costs = (inp.productionCostPerEpisode || 0) * (inp.episodesPerMonth || 0);
    return sponsor + premium - costs;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Increase downloads
    const currentCPMRevPerDownload = inputs.sponsorCPM * (inputs.sponsorFillRate / 100) / 1000;
    const revenueNeededFromSponsors = goalRevenue - m.premiumRevenue;
    const neededMonthlyDownloads = currentCPMRevPerDownload > 0 ? revenueNeededFromSponsors / currentCPMRevPerDownload : 0;
    const neededDownloadsPerEp = inputs.episodesPerMonth > 0 ? Math.ceil(neededMonthlyDownloads / inputs.episodesPerMonth) : 0;
    results.push({
      label: 'Grow Downloads',
      description: `Reach ${neededDownloadsPerEp.toLocaleString()} downloads/episode`,
      change: inputs.downloadsPerEpisode > 0 ? ((neededDownloadsPerEp - inputs.downloadsPerEpisode) / inputs.downloadsPerEpisode) * 100 : 0,
    });
    // Path 2: Increase premium subscribers
    const revenueGap = goalRevenue - m.sponsorRevenue;
    const neededPremiumSubs = inputs.premiumPrice > 0 ? Math.ceil(revenueGap / inputs.premiumPrice) : 0;
    results.push({
      label: 'Grow Premium Subscribers',
      description: `Reach ${Math.max(0, neededPremiumSubs).toLocaleString()} premium subs`,
      change: inputs.premiumSubscribers > 0 ? ((neededPremiumSubs - inputs.premiumSubscribers) / inputs.premiumSubscribers) * 100 : 0,
    });
    // Path 3: Increase CPM
    const neededCPM = m.monthlyDownloads > 0 && inputs.sponsorFillRate > 0
      ? (goalRevenue - m.premiumRevenue) / ((m.monthlyDownloads / 1000) * (inputs.sponsorFillRate / 100))
      : 0;
    results.push({
      label: 'Negotiate Higher CPM',
      description: `Increase CPM to $${Math.max(0, neededCPM).toFixed(0)}`,
      change: inputs.sponsorCPM > 0 ? ((neededCPM - inputs.sponsorCPM) / inputs.sponsorCPM) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: ['Sponsorship', 'Premium Subs', 'Production Costs'],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.sponsorRevenue, s.metrics.premiumRevenue, s.metrics.totalCosts],
      backgroundColor: [
        `${scenarioColors[idx]}B3`,
        `${scenarioColors[idx]}99`,
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
            return `${ctx.dataset.label}: ${formatCurrency(v ?? 0)}`;
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
    if (m.profit < 0) {
      return {
        status: 'danger',
        title: `Your podcast is losing ${formatCurrency(Math.abs(m.profit))}/month \u2014 costs exceed revenue.`,
        actions: [
          {
            icon: '\u{1F3AF}',
            text: 'Reduce production costs \u2014 consider batch recording, simpler editing, or AI-assisted production.',
            affiliateText: 'Convert listeners to subscribers with Beehiiv',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '\u{1F4C8}', text: 'Focus on growing downloads before investing in production quality \u2014 audience size drives sponsor revenue.' },
          { icon: '\u{1F4B0}', text: 'Launch a premium subscription tier to add non-download-dependent revenue.' },
        ],
      };
    }
    if (m.profit < 500) {
      return {
        status: 'warning',
        title: `Profit of ${formatCurrency(m.profit)}/mo \u2014 your podcast covers costs but needs growth.`,
        actions: [
          { icon: '\u{1F4E7}', text: 'Build a newsletter to cross-promote episodes and create an additional monetization channel.' },
          {
            icon: '\u{1F91D}',
            text: 'Pitch direct sponsors \u2014 niche podcasts can command 2-3x marketplace CPM rates with direct deals.',
            affiliateText: 'Build your podcast newsletter with Beehiiv',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '\u{1F399}\uFE0F', text: 'Increase episode frequency \u2014 more episodes means more inventory for sponsors and more downloads.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    if (m.profit < 3000) {
      return {
        status: 'good',
        title: `Profit of ${formatCurrency(m.profit)}/mo \u2014 solid foundation for podcast monetization.`,
        actions: [
          { icon: '\u{1F680}', text: 'Scale your audience through guest appearances on larger podcasts and strategic cross-promotion.' },
          {
            icon: '\u{1F4F0}',
            text: 'Launch a companion newsletter to diversify revenue and own your audience relationship.',
            affiliateText: 'Start a podcast newsletter with Beehiiv',
            affiliateUrl: affiliateData.partners.beehiiv.url,
          },
          { icon: '\u{1F4E6}', text: 'Create branded merchandise or digital products to monetize your most engaged listeners.', link: '/tools/course-revenue-estimator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Profit of ${formatCurrency(m.profit)}/mo \u2014 your podcast is a strong revenue engine.`,
      actions: [
        {
          icon: '\u{1F310}',
          text: 'Expand to video (YouTube) to reach new audiences and create additional ad inventory.',
          affiliateText: 'Scale your audience with Beehiiv',
          affiliateUrl: affiliateData.partners.beehiiv.url,
        },
        { icon: '\u{1F4DA}', text: 'Launch premium content (courses, coaching, community) to capture high-value listeners.' },
        { icon: '\u{1F3AF}', text: 'Negotiate annual sponsor deals \u2014 lock in higher CPMs with volume commitments.' },
      ],
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Podcast Revenue Calculator</h1>
        <p className="text-label max-w-2xl">
          Estimate your podcast revenue from sponsorships and premium subscriptions.
          Model download growth, CPM rates, and production costs to find your break-even
          point and optimize your monetization strategy.
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
          <ScenarioSlider label="Downloads per Episode" value={inputs.downloadsPerEpisode} min={10} max={500000} step={10} onChange={(v) => update('downloadsPerEpisode', v)} benchmarkChips={[{ label: '100', value: 100 }, { label: '1K', value: 1000 }, { label: '5K', value: 5000 }, { label: '10K', value: 10000 }, { label: '50K', value: 50000 }]} />
          <ScenarioSlider label="Episodes per Month" value={inputs.episodesPerMonth} min={1} max={30} step={1} benchmark={benchmarks.podcast.avg_episodes_per_month} benchmarkLabel="Industry avg" onChange={(v) => update('episodesPerMonth', v)} />
          <ScenarioSlider label="Sponsor CPM Rate" value={inputs.sponsorCPM} min={1} max={100} step={1} prefix="$" benchmark={benchmarks.podcast.avg_cpm_rate} benchmarkLabel="Industry avg" onChange={(v) => update('sponsorCPM', v)} />

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
              <ScenarioSlider label="Sponsor Fill Rate" value={inputs.sponsorFillRate} min={0} max={100} step={1} suffix="%" benchmark={benchmarks.podcast.avg_sponsorship_fill_rate} benchmarkLabel="Industry avg" onChange={(v) => update('sponsorFillRate', v)} />
              <ScenarioSlider label="Premium Subscribers" value={inputs.premiumSubscribers} min={0} max={10000} step={1} onChange={(v) => update('premiumSubscribers', v)} />
              <ScenarioSlider label="Premium Price" value={inputs.premiumPrice} min={1} max={50} step={0.5} prefix="$" onChange={(v) => update('premiumPrice', v)} />
              <ScenarioSlider label="Production Cost / Episode" value={inputs.productionCostPerEpisode} min={0} max={5000} step={10} prefix="$" benchmark={benchmarks.podcast.avg_production_cost_per_episode} benchmarkLabel="Industry avg" onChange={(v) => update('productionCostPerEpisode', v)} />
            </div>
          )}
        </div>

        {/* ============ RESULTS PANEL ============ */}
        <div>
          {scenarios.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <KPICard title="Monthly Revenue" value={formatCurrency(m.totalRevenue)} subtitle={`${formatNumber(m.monthlyDownloads)} downloads/mo`} color={m.totalRevenue > m.totalCosts ? 'green' : 'red'} />
              <KPICard title="Profit" value={formatCurrency(m.profit)} subtitle={m.profit > 0 ? 'Above break-even' : 'Below break-even'} color={m.profit > 0 ? 'green' : 'red'} clickable onGoalSubmit={() => { setIsReverse(!isReverse); }} />
              <KPICard title="Revenue / Episode" value={formatCurrency(m.revenuePerEpisode)} subtitle={`$${m.revenuePerDownload.toFixed(3)} per download`} color="blue" />
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {allMetrics.map((s, idx) => (
                <div key={s.id} className="bg-surface rounded-lg border border-surface-lighter p-3">
                  <p className="text-xs font-semibold mb-2" style={{ color: scenarioColors[idx] }}>{s.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase">Revenue</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>{formatCurrency(s.metrics.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Profit</p>
                      <p className={`font-mono text-lg font-bold ${s.metrics.profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(s.metrics.profit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Rev/Episode</p>
                      <p className="font-mono text-lg font-bold text-foreground">{formatCurrency(s.metrics.revenuePerEpisode)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="podcast-revenue-calculator" />

          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Revenue Streams vs. Costs</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge label="Your Downloads vs. Industry Average" value={inputs.downloadsPerEpisode} benchmark={benchmarks.podcast.avg_download_per_episode} min={0} max={Math.max(inputs.downloadsPerEpisode * 2, 1000)} suffix="" affiliateUrl={affiliateData.partners.beehiiv.url} affiliateText="Grow your podcast audience" />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="podcast-revenue-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Revenue &mdash; How to reach your monthly revenue goal
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Monthly Revenue</label>
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
      <RiskRadar inputs={inputs} labels={{ downloadsPerEpisode: 'Downloads/Ep', episodesPerMonth: 'Episodes/Mo', sponsorCPM: 'CPM Rate', sponsorFillRate: 'Fill Rate', premiumSubscribers: 'Premium Subs', premiumPrice: 'Premium Price', productionCostPerEpisode: 'Production Cost' }} calculateFn={calcProfit} resultLabel="monthly profit" />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Understanding Podcast Revenue</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Podcast monetization has matured significantly, but the economics remain challenging
            for most creators. The median podcast gets around 141 downloads per episode &mdash; far below
            the thresholds most ad networks require. This means the majority of podcast revenue
            comes from either direct sponsor relationships, premium content subscriptions, or
            ancillary revenue streams like newsletters, courses, and consulting. This calculator
            models the two primary revenue streams &mdash; sponsorships and premium subscriptions &mdash; so
            you can see exactly how audience growth translates to income.
          </p>
          <p>
            Sponsorship revenue is driven by three factors: total downloads (audience size times
            episode frequency), CPM rate (what sponsors pay per 1,000 downloads), and fill rate
            (what percentage of your episodes have sponsors). Growing any of these three levers
            increases revenue proportionally. The industry average CPM for mid-roll ads is $25,
            but niche podcasts with highly engaged audiences can command $50-80 CPM through
            direct sponsor relationships.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Diversifying Beyond Sponsorships</h3>
          <p>
            The most financially successful podcasters do not rely solely on advertising. Premium
            content subscriptions provide predictable recurring revenue that is independent of
            download numbers. Even converting 3-5% of your audience to paying subscribers at $5
            per month creates meaningful income that grows with your audience. Beyond that,
            podcasts are excellent audience-building tools for higher-value offerings like courses,
            coaching, and consulting. To convert podcast listeners into newsletter subscribers and unlock additional monetization channels, <a href={affiliateData.partners.beehiiv.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">Beehiiv provides purpose-built tools for podcasters to grow and monetize their audience beyond audio</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Optimizing Production Costs</h3>
          <p>
            Production costs are the primary expense for most podcasters. The industry average is
            around $200 per episode, covering editing, hosting, and basic marketing. You can reduce
            costs by batch recording (recording multiple episodes in one session), using AI-assisted
            editing tools, or keeping production simple with minimal post-production. The key is
            finding the quality level your audience expects without over-investing in production
            that does not drive additional downloads. For building a companion newsletter to cross-promote episodes and grow your audience, <a href={affiliateData.partners.beehiiv.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline">try Beehiiv&apos;s newsletter platform to turn listeners into subscribers</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Growth Strategies for Podcast Revenue</h3>
          <p>
            The fastest path to podcast revenue growth is increasing downloads per episode. Focus
            on discoverability (SEO-optimized titles and descriptions), cross-promotion (guesting
            on other podcasts), and audience retention (building an email list to notify subscribers
            of new episodes). Each additional download creates more sponsor inventory and brings
            you closer to the thresholds where ad networks and premium sponsors become available.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="podcast-revenue-calculator" />
      <PreRelatedCTA toolSlug="podcast-revenue-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="podcast-revenue-calculator" />
    </div>
  );
}
