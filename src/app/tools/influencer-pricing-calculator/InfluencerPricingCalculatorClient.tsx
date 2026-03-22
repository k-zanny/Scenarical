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
  followers: 50000,
  engagementRate: 3.0,
  postsPerCampaign: 3,
};

type Inputs = typeof defaults;

type Platform = 'instagram' | 'tiktok' | 'youtube';
type ContentType = 'post' | 'video' | 'story' | 'reel';

interface Scenario {
  id: string;
  label: string;
  inputs: Inputs;
}

const platformCPE: Record<Platform, number> = {
  instagram: benchmarks.influencer.avg_cpe_instagram,
  tiktok: benchmarks.influencer.avg_cpe_tiktok,
  youtube: benchmarks.influencer.avg_cpe_youtube,
};

const contentMultipliers: Record<ContentType, number> = {
  post: 1.0,
  video: benchmarks.influencer.avg_video_rate_multiplier,
  story: benchmarks.influencer.avg_story_rate_multiplier,
  reel: 1.5,
};

const platformLabels: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const contentLabels: Record<ContentType, string> = {
  post: 'Post',
  video: 'Video',
  story: 'Story',
  reel: 'Reel',
};

/* ================================================================== */
/*  FAQs                                                               */
/* ================================================================== */
const faqs = [
  {
    question: 'How much should I charge as an influencer?',
    answer: 'Influencer rates depend on follower count, engagement rate, platform, content type, and niche. A common starting formula is to calculate your engaged audience (followers times engagement rate) and multiply by a cost-per-engagement rate that varies by platform. Instagram averages $0.10 per engagement, TikTok $0.05, and YouTube $0.15. Multiply by content type multipliers (video content is typically 2x a standard post) to arrive at your suggested rate.',
  },
  {
    question: 'What is a good engagement rate for influencers?',
    answer: 'Engagement rates vary inversely with follower count. Micro-influencers (10K-50K followers) average 3.86% engagement, mid-tier (50K-500K) average 1.63%, and macro-influencers (500K+) average 1.21%. A higher engagement rate relative to your tier indicates a more valuable, active audience. Brands increasingly prioritize engagement rate over raw follower count when evaluating influencer partnerships.',
  },
  {
    question: 'How do I calculate CPM for influencer content?',
    answer: 'Influencer CPM (cost per mille / cost per thousand impressions) is calculated by dividing your rate per post by your follower count, then multiplying by 1,000. For example, if you charge $500 per post and have 50,000 followers, your CPM is $10. Industry average CPMs range from $5-$15 for micro-influencers to $15-$50 for macro-influencers. Lower CPMs are more attractive to brands, but very low CPMs may indicate underpricing.',
  },
  {
    question: 'Why do rates differ so much between platforms?',
    answer: 'Platform rate differences reflect content creation effort, audience engagement patterns, and content longevity. YouTube commands the highest rates because video production requires more effort and YouTube content has a much longer shelf life — videos continue generating views for months or years. TikTok rates are lower per-post because content creation is faster and content has a shorter lifespan, though volume can compensate. Instagram sits in the middle, with rates varying significantly between stories (lowest), posts, and reels.',
  },
];

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs, platform: Platform, contentType: ContentType) {
  const engagements = inp.followers * inp.engagementRate / 100;
  const cpe = platformCPE[platform];
  const baseRate = engagements * cpe;
  const contentMult = contentMultipliers[contentType];
  const suggestedRate = baseRate * contentMult;
  const totalCampaignCost = suggestedRate * inp.postsPerCampaign;
  const cpm = inp.followers > 0 ? (suggestedRate / inp.followers) * 1000 : 0;
  const estimatedReach = inp.followers * 0.3;
  return { engagements, cpe, baseRate, contentMult, suggestedRate, totalCampaignCost, cpm, estimatedReach };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function InfluencerPricingCalculatorClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: 'Scenario A', inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [contentType, setContentType] = useState<ContentType>('post');
  const [isReverse, setIsReverse] = useState(false);
  const [goalRate, setGoalRate] = useState(1000);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('influencer-pricing-calculator');
    if (saved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = saved as Record<string, any>;
      if (raw.platform) { setPlatform(raw.platform as Platform); delete raw.platform; }
      if (raw.contentType) { setContentType(raw.contentType as ContentType); delete raw.contentType; }
      setScenarios(prev => [{ ...prev[0], inputs: { ...defaults, ...raw } }]);
    }
    const params = new URLSearchParams(window.location.search);
    const urlInputs: Partial<Inputs> = {};
    params.forEach((v, k) => {
      if (k === 'platform') setPlatform(v as Platform);
      else if (k === 'contentType') setContentType(v as ContentType);
      else if (k in defaults) urlInputs[k as keyof Inputs] = parseFloat(v);
    });
    if (Object.keys(urlInputs).length > 0) {
      setScenarios(prev => [{ ...prev[0], inputs: { ...prev[0].inputs, ...urlInputs } }]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveToLocalStorage('influencer-pricing-calculator', { ...inputs, platform, contentType } as any);
  }, [inputs, platform, contentType]);

  const update = (key: keyof Inputs, value: number) => {
    setScenarios(prev => prev.map(s =>
      s.id === activeScenario ? { ...s, inputs: { ...s.inputs, [key]: value } } : s
    ));
  };

  const resetDefaults = () => {
    setScenarios(prev => prev.map(s =>
      s.id === activeScenario ? { ...s, inputs: { ...defaults } } : s
    ));
    setPlatform('instagram');
    setContentType('post');
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
  const allMetrics = scenarios.map(s => ({ ...s, metrics: computeMetrics(s.inputs, platform, contentType) }));
  const m = computeMetrics(inputs, platform, contentType);

  const calcProfit = useCallback((inp: Record<string, number>) => {
    const eng = (inp.followers || 0) * (inp.engagementRate || 0) / 100;
    const cpe = platformCPE[platform];
    const base = eng * cpe;
    return base * contentMultipliers[contentType];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, contentType]);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    // Path 1: Needed followers
    const ratePerFollower = inputs.followers > 0 ? m.suggestedRate / inputs.followers : 0;
    const neededFollowers = ratePerFollower > 0 ? Math.ceil(goalRate / ratePerFollower) : 0;
    results.push({
      label: 'Grow Followers',
      description: `Grow to ${formatNumber(neededFollowers)} followers`,
      change: inputs.followers > 0 ? ((neededFollowers - inputs.followers) / inputs.followers) * 100 : 0,
    });
    // Path 2: Improve engagement rate
    const cpe = platformCPE[platform];
    const contentMult = contentMultipliers[contentType];
    const neededEngagements = cpe > 0 && contentMult > 0 ? goalRate / (cpe * contentMult) : 0;
    const neededEngRate = inputs.followers > 0 ? (neededEngagements / inputs.followers) * 100 : 0;
    results.push({
      label: 'Improve Engagement',
      description: `Engagement rate to ${neededEngRate.toFixed(2)}%`,
      change: inputs.engagementRate > 0 ? ((neededEngRate - inputs.engagementRate) / inputs.engagementRate) * 100 : 0,
    });
    // Path 3: Switch content type
    const currentRate = m.suggestedRate;
    const videoRate = m.baseRate * contentMultipliers.video;
    results.push({
      label: 'Switch to Video Content',
      description: `Video rate: ${formatCurrency(videoRate, 0)}/post`,
      change: currentRate > 0 ? ((videoRate - currentRate) / currentRate) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data — rate across follower tiers
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const tierData = [
    { label: 'Micro (10K)', followers: 10000, engRate: benchmarks.influencer.avg_engagement_rate_micro },
    { label: 'Mid (50K)', followers: 50000, engRate: benchmarks.influencer.avg_engagement_rate_mid },
    { label: 'Macro (500K)', followers: 500000, engRate: benchmarks.influencer.avg_engagement_rate_macro },
  ];

  const chartData = {
    labels: ['Your Rate', ...tierData.map(t => t.label)],
    datasets: allMetrics.map((s, idx) => {
      const tierRates = tierData.map(t => {
        const eng = t.followers * t.engRate / 100;
        return eng * platformCPE[platform] * contentMultipliers[contentType];
      });
      return {
        label: s.label,
        data: [s.metrics.suggestedRate, ...tierRates],
        backgroundColor: [
          `${scenarioColors[idx]}B3`,
          ...tierRates.map(() => idx === 0 ? '#64748B80' : 'transparent'),
        ],
        borderColor: scenarioColors[idx],
        borderWidth: 1,
        borderRadius: 6,
      };
    }),
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

  // Determine engagement tier for benchmarking
  const getEngagementBenchmark = () => {
    if (inputs.followers < 50000) return benchmarks.influencer.avg_engagement_rate_micro;
    if (inputs.followers < 500000) return benchmarks.influencer.avg_engagement_rate_mid;
    return benchmarks.influencer.avg_engagement_rate_macro;
  };

  // Action panel
  const getActions = (): { status: 'danger' | 'warning' | 'good' | 'excellent'; title: string; actions: Action[] } => {
    const engBenchmark = getEngagementBenchmark();
    if (inputs.engagementRate < engBenchmark * 0.5) {
      return {
        status: 'danger',
        title: `Engagement rate of ${inputs.engagementRate}% is well below the ${engBenchmark}% average for your follower tier.`,
        actions: [
          {
            icon: '🚨',
            text: 'Low engagement signals audience mismatch or inactive followers. Audit your audience and remove bots or inactive accounts.',
            affiliateText: 'Analyze your audience with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '📉', text: 'Focus on content that drives comments and saves — algorithm-friendly content naturally boosts engagement rates.' },
          { icon: '🎯', text: 'Post consistently at optimal times — irregular posting schedules are a top cause of declining engagement.' },
        ],
      };
    }
    if (inputs.engagementRate < engBenchmark) {
      return {
        status: 'warning',
        title: `Engagement rate of ${inputs.engagementRate}% is below the ${engBenchmark}% benchmark for your tier.`,
        actions: [
          { icon: '💬', text: 'Engage actively with your community — reply to comments, ask questions, and create interactive content.' },
          {
            icon: '📊',
            text: 'Analyze which content types drive highest engagement and double down on those formats.',
            affiliateText: 'Research top-performing content with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🤝', text: 'Collaborate with creators in your niche to cross-pollinate engaged audiences.', link: '/tools/content-roi-calculator' },
        ],
      };
    }
    if (inputs.engagementRate < engBenchmark * 2) {
      return {
        status: 'good',
        title: `Engagement rate of ${inputs.engagementRate}% is above average — brands will value your audience quality.`,
        actions: [
          { icon: '📈', text: 'Leverage your strong engagement to negotiate premium rates — engagement matters more than follower count to smart brands.' },
          {
            icon: '🔄',
            text: 'Create a media kit highlighting your engagement metrics alongside follower count.',
            affiliateText: 'Build your brand presence with Semrush → Try free',
            affiliateUrl: affiliateData.partners.semrush.url,
          },
          { icon: '🧪', text: 'Test different content formats — strong engagement gives you room to experiment and find what scales.', link: '/tools/ab-test-calculator' },
        ],
      };
    }
    return {
      status: 'excellent',
      title: `Engagement rate of ${inputs.engagementRate}% is exceptional — your audience is highly active and valuable.`,
      actions: [
        {
          icon: '🚀',
          text: 'You have pricing power — charge at the top of your tier and negotiate based on engagement, not follower count.',
          affiliateText: 'Scale your influencer business with Semrush → Try free',
          affiliateUrl: affiliateData.partners.semrush.url,
        },
        { icon: '🌐', text: 'Consider launching your own products or newsletter — your engaged audience is ready to buy directly from you.', link: '/tools/newsletter-value-calculator' },
        { icon: '📧', text: 'Build an email list from your following — owned audience is more valuable than any social platform.' },
      ],
    };
  };

  const actionData = getActions();

  // Share inputs include platform and contentType
  const shareInputs = { ...inputs, platform, contentType } as unknown as Record<string, number>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">Influencer Pricing Calculator</h1>
        <p className="text-label max-w-2xl">
          Calculate suggested influencer rates per post, total campaign costs, and CPM based
          on your followers, engagement rate, platform, and content type. Compare pricing
          across follower tiers and share your analysis — all in real time.
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

          {/* Platform selector */}
          <div className="mb-4">
            <label className="text-sm text-label mb-2 block">Platform</label>
            <div className="flex gap-2">
              {(Object.keys(platformLabels) as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                    platform === p
                      ? 'bg-accent text-white border-accent'
                      : 'text-label border-surface-lighter hover:border-accent/50 hover:text-foreground'
                  }`}
                >
                  {platformLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Content type selector */}
          <div className="mb-4">
            <label className="text-sm text-label mb-2 block">Content Type</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(contentLabels) as ContentType[]).map((ct) => (
                <button
                  key={ct}
                  onClick={() => setContentType(ct)}
                  className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                    contentType === ct
                      ? 'bg-accent text-white border-accent'
                      : 'text-label border-surface-lighter hover:border-accent/50 hover:text-foreground'
                  }`}
                >
                  {contentLabels[ct]}
                  {ct !== 'post' && (
                    <span className="ml-1 text-xs opacity-70">
                      {contentMultipliers[ct]}x
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Inputs */}
          <ScenarioSlider
            label="Followers"
            value={inputs.followers}
            min={1000}
            max={5000000}
            step={1000}
            onChange={(v) => update('followers', v)}
            benchmarkChips={[
              { label: '10K', value: 10000 },
              { label: '50K', value: 50000 },
              { label: '100K', value: 100000 },
              { label: '500K', value: 500000 },
              { label: '1M', value: 1000000 },
            ]}
          />
          <ScenarioSlider
            label="Engagement Rate"
            value={inputs.engagementRate}
            min={0.1}
            max={15}
            step={0.1}
            suffix="%"
            benchmark={getEngagementBenchmark()}
            benchmarkLabel="Tier avg"
            onChange={(v) => update('engagementRate', v)}
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
                label="Posts per Campaign"
                value={inputs.postsPerCampaign}
                min={1}
                max={20}
                step={1}
                onChange={(v) => update('postsPerCampaign', v)}
                benchmarkChips={[
                  { label: '1 post', value: 1 },
                  { label: '3 posts', value: 3 },
                  { label: '5 posts', value: 5 },
                  { label: '10 posts', value: 10 },
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
                title="Suggested Rate/Post"
                value={formatCurrency(m.suggestedRate, 0)}
                subtitle={`${formatNumber(m.engagements, 0)} engagements`}
                color={m.suggestedRate >= 500 ? 'green' : m.suggestedRate >= 100 ? 'amber' : 'blue'}
                clickable
                onGoalSubmit={() => { setIsReverse(!isReverse); }}
              />
              <KPICard
                title="Campaign Total"
                value={formatCurrency(m.totalCampaignCost, 0)}
                subtitle={`${inputs.postsPerCampaign} posts`}
                color="blue"
              />
              <KPICard
                title="CPM"
                value={formatCurrency(m.cpm, 2)}
                subtitle={`~${formatNumber(m.estimatedReach, 0)} est. reach`}
                color={m.cpm <= 15 ? 'green' : m.cpm <= 30 ? 'amber' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">Rate/Post</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {formatCurrency(s.metrics.suggestedRate, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">Campaign Total</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.totalCampaignCost, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">CPM</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.cpm, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="influencer-pricing-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">Rate by Follower Tier ({platformLabels[platform]} — {contentLabels[contentType]})</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label="Your Engagement vs. Average"
            value={inputs.engagementRate}
            benchmark={getEngagementBenchmark()}
            min={0}
            max={10}
            suffix="%"
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText="Analyze influencer metrics"
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="influencer-pricing-calculator" inputs={shareInputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Target Rate — What do I need to charge?
          </h3>
          <div className="mb-4">
            <label className="text-sm text-label">Target Rate per Post</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalRate}
                onChange={(e) => setGoalRate(parseFloat(e.target.value) || 0)}
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
          followers: 'Followers',
          engagementRate: 'Engagement Rate',
          postsPerCampaign: 'Posts/Campaign',
        }}
        calculateFn={calcProfit}
        resultLabel="suggested rate"
      />

      {/* SEO Content */}
      <div className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">How to Price Influencer Content</h2>
        <div className="space-y-4 text-sm text-label leading-relaxed">
          <p>
            Pricing influencer content is one of the most debated topics in creator economics. Charge
            too little and you leave money on the table while devaluing the industry. Charge too much
            and brands pass you over for creators who better understand market rates. The key is
            finding a rate grounded in data — your actual engagement numbers, platform norms, and
            content type — rather than guessing or copying what others claim to charge.
          </p>
          <p>
            This calculator uses an engagement-based pricing model, which is increasingly the standard
            for how brands evaluate influencer partnerships. Instead of simply multiplying followers by
            a flat rate (which rewards vanity metrics), it calculates your actual engaged audience,
            applies a platform-specific cost-per-engagement rate, and adjusts for content type. The
            result is a suggested rate that reflects the real value you deliver to brand partners.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Understanding Platform Rate Differences</h3>
          <p>
            Platform choice significantly affects pricing. YouTube commands the highest cost-per-engagement
            ($0.15) because video content requires more production effort and has exceptional longevity —
            a well-produced YouTube video can generate views and brand impressions for years. Instagram
            sits at $0.10 per engagement, reflecting its visual-first format and strong brand integration
            capabilities. TikTok has the lowest CPE at $0.05, balanced by typically higher engagement
            rates and the platform&apos;s viral potential. Content type multipliers add another layer:
            video content commands 2x a standard post, stories 0.4x (reflecting their ephemeral nature),
            and reels 1.5x.
          </p>
          <p>
            Follower tier also matters. Micro-influencers (under 50K followers) typically have higher
            engagement rates (averaging 3.86%) but lower absolute rates. Mid-tier influencers (50K-500K)
            average 1.63% engagement with rates from $500 to $5,000 per post. Macro-influencers (500K+)
            have the lowest average engagement at 1.21% but command premium rates due to reach. Brands
            increasingly recognize that micro-influencer partnerships often deliver better ROI per
            dollar spent. To research which influencers deliver real engagement versus inflated numbers,
            <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline"> Semrush provides social media analytics that reveal true engagement patterns and audience demographics</a>.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">Maximizing Your Influencer Revenue</h3>
          <p>
            Beyond per-post pricing, successful influencers build multiple revenue streams. Brand
            partnerships are typically the largest income source, but smart creators also monetize
            through affiliate marketing, digital products, courses, newsletter sponsorships, and
            community memberships. The most valuable asset you build as an influencer is not your
            follower count — it is your relationship with an engaged audience that trusts your
            recommendations.
          </p>
          <p>
            To command higher rates, focus on building engagement rather than chasing follower count.
            Create content that drives comments, saves, and shares — these signals tell both algorithms
            and brand partners that your audience is genuinely invested. Build a professional media kit
            that leads with engagement metrics, audience demographics, and past campaign results. For
            comprehensive competitive intelligence on your niche and content strategy,
            <a href={affiliateData.partners.semrush.url} target="_blank" rel="sponsored noopener" className="text-accent hover:underline"> try Semrush to analyze trending topics, competitor content performance, and audience insights that help you create higher-performing content</a>.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <FAQSection faqs={faqs} />

      <FeedbackWidget toolSlug="influencer-pricing-calculator" />
      <PreRelatedCTA toolSlug="influencer-pricing-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="influencer-pricing-calculator" />
    </div>
  );
}
