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
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ================================================================== */
/*  Defaults & Types                                                   */
/* ================================================================== */
const defaults = {
  referringDomainDA: 50,
  linkRelevance: 70,
  isDoFollow: 1,
  referralTraffic: 100,
  avgTrafficValue: 0.75,
  linkPlacement: 50,
};

type Inputs = typeof defaults;

interface Scenario {
  id: string;
  label: string;
  inputs: Inputs;
}

/* ================================================================== */
/*  Locale texts interface                                             */
/* ================================================================== */
export interface BacklinkLocaleTexts {
  locale: 'en' | 'fr';
  pageTitle: string;
  pageSubtitle: string;
  scenarioLabel: string;
  addScenario: string;
  reset: string;
  referringDomainDA: string;
  establishedSiteAvg: string;
  daChips: { label: string; value: number }[];
  linkRelevance: string;
  relevanceChips: { label: string; value: number }[];
  doFollowLabel: string;
  doFollowChips: { label: string; value: number }[];
  showAdvanced: string;
  hideAdvanced: string;
  monthlyReferralTraffic: string;
  trafficChips: { label: string; value: number }[];
  avgTrafficValueLabel: string;
  avgTrafficValueBenchmark: string;
  linkPlacementLabel: string;
  placementChips: { label: string; value: number }[];
  qualityScoreTitle: string;
  qualityLabels: { premium: string; aboveAvg: string; belowAvg: string; low: string };
  monthlyValueTitle: string;
  referralLabel: string;
  seoLabel: string;
  fairPriceTitle: string;
  basedOnAnnual: string;
  chartTitle: string;
  chartLabelReferral: string;
  chartLabelSEO: string;
  benchmarkGaugeLabel: string;
  benchmarkGaugeCTA: string;
  reverseTitle: string;
  reverseInputLabel: string;
  reversePaths: { targetDA: string; targetTraffic: string; improveRelevance: string };
  reverseDescriptions: {
    daPrefix: string;
    daSuffix: string;
    trafficPrefix: string;
    trafficSuffix: string;
    relevance: string;
  };
  reverseSmallest: string;
  reverseClose: string;
  changeLabel: string;
  riskLabels: Record<string, string>;
  riskResultLabel: string;
  actionTitles: {
    danger: (score: string) => string;
    warning: (score: string) => string;
    good: (score: string) => string;
    excellent: (score: string) => string;
  };
  actionItems: {
    danger: (semrushUrl: string) => Action[];
    warning: (fairPrice: string, semrushUrl: string) => Action[];
    good: (fairPrice: string, semrushUrl: string) => Action[];
    excellent: (fairPrice: string, semrushUrl: string) => Action[];
  };
  seoContent: React.ReactNode;
  faqs: { question: string; answer: string }[];
  languageSwitcher: { label: string; href: string };
}

/* ================================================================== */
/*  Helper: compute metrics from inputs                                */
/* ================================================================== */
function computeMetrics(inp: Inputs) {
  const daFactor = inp.referringDomainDA / 100;
  const relevanceFactor = inp.linkRelevance / 100;
  const followFactor = inp.isDoFollow ? 1.0 : 0.3;
  const placementFactor = inp.linkPlacement / 100;
  const qualityScore = (daFactor * 0.4 + relevanceFactor * 0.3 + followFactor * 0.15 + placementFactor * 0.15) * 100;
  const monthlyReferralValue = inp.referralTraffic * inp.avgTrafficValue;
  const seoValue = qualityScore * 5;
  const totalMonthlyValue = monthlyReferralValue + seoValue;
  const annualValue = totalMonthlyValue * 12;
  const fairPrice = annualValue * 0.5;

  return { qualityScore, monthlyReferralValue, seoValue, totalMonthlyValue, annualValue, fairPrice };
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function BacklinkCalculatorCore({ t }: { t: BacklinkLocaleTexts }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'A', label: `${t.scenarioLabel} A`, inputs: { ...defaults } },
  ]);
  const [activeScenario, setActiveScenario] = useState('A');
  const [isReverse, setIsReverse] = useState(false);
  const [goalValue, setGoalValue] = useState(500);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const inputs = currentScenario.inputs;

  // Load saved data
  useEffect(() => {
    const saved = loadFromLocalStorage('backlink-value-calculator');
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
    saveToLocalStorage('backlink-value-calculator', inputs);
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
    setScenarios(prev => [...prev, { id: nextId, label: `${t.scenarioLabel} ${nextId}`, inputs: { ...inputs } }]);
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
    const daF = (inp.referringDomainDA || 0) / 100;
    const relF = (inp.linkRelevance || 0) / 100;
    const folF = inp.isDoFollow ? 1.0 : 0.3;
    const plaF = (inp.linkPlacement || 0) / 100;
    const qs = (daF * 0.4 + relF * 0.3 + folF * 0.15 + plaF * 0.15) * 100;
    const refVal = (inp.referralTraffic || 0) * (inp.avgTrafficValue || 0);
    const seoVal = qs * 5;
    return refVal + seoVal;
  }, []);

  // Reverse goal calculation
  const reverseScenarios = isReverse ? (() => {
    const results = [];
    const neededMonthlyValue = goalValue / 6;
    const additionalSEONeeded = Math.max(0, neededMonthlyValue - m.monthlyReferralValue);
    const neededQS = additionalSEONeeded / 5;
    const neededDA = Math.min(100, Math.ceil(neededQS / 0.4 * 100 / 100));
    results.push({
      label: t.reversePaths.targetDA,
      description: `${t.reverseDescriptions.daPrefix} DA ${neededDA}+ ${t.reverseDescriptions.daSuffix}`,
      change: inputs.referringDomainDA > 0 ? ((neededDA - inputs.referringDomainDA) / inputs.referringDomainDA) * 100 : 0,
    });
    const neededTraffic = inputs.avgTrafficValue > 0 ? Math.ceil((neededMonthlyValue - m.seoValue) / inputs.avgTrafficValue) : 0;
    results.push({
      label: t.reversePaths.targetTraffic,
      description: `${t.reverseDescriptions.trafficPrefix} ${formatNumber(Math.max(0, neededTraffic))}+ ${t.reverseDescriptions.trafficSuffix}`,
      change: inputs.referralTraffic > 0 ? ((Math.max(0, neededTraffic) - inputs.referralTraffic) / inputs.referralTraffic) * 100 : 0,
    });
    results.push({
      label: t.reversePaths.improveRelevance,
      description: t.reverseDescriptions.relevance,
      change: inputs.linkRelevance < 100 ? ((100 - inputs.linkRelevance) / inputs.linkRelevance) * 100 : 0,
    });
    return results.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  })() : [];

  // Chart data
  const scenarioColors = ['#3B82F6', '#10B981', '#F59E0B'];

  const chartData = {
    labels: [t.chartLabelReferral, t.chartLabelSEO],
    datasets: allMetrics.map((s, idx) => ({
      label: s.label,
      data: [s.metrics.monthlyReferralValue, s.metrics.seoValue],
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
            return `${ctx.dataset.label}: ${formatCurrency(v)}/${t.locale === 'fr' ? 'mois' : 'mo'}`;
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
    const semrushUrl = affiliateData.partners.semrush.url;
    if (m.qualityScore < 25) {
      return {
        status: 'danger',
        title: t.actionTitles.danger(m.qualityScore.toFixed(0)),
        actions: t.actionItems.danger(semrushUrl),
      };
    }
    if (m.qualityScore < 50) {
      return {
        status: 'warning',
        title: t.actionTitles.warning(m.qualityScore.toFixed(0)),
        actions: t.actionItems.warning(formatCurrency(m.fairPrice), semrushUrl),
      };
    }
    if (m.qualityScore < 75) {
      return {
        status: 'good',
        title: t.actionTitles.good(m.qualityScore.toFixed(0)),
        actions: t.actionItems.good(formatCurrency(m.fairPrice), semrushUrl),
      };
    }
    return {
      status: 'excellent',
      title: t.actionTitles.excellent(m.qualityScore.toFixed(0)),
      actions: t.actionItems.excellent(formatCurrency(m.fairPrice), semrushUrl),
    };
  };

  const actionData = getActions();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with language switcher */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{t.pageTitle}</h1>
            <p className="text-label max-w-2xl">{t.pageSubtitle}</p>
          </div>
          <Link
            href={t.languageSwitcher.href}
            className="text-xs text-muted hover:text-accent transition-colors border border-surface-lighter rounded-md px-2.5 py-1.5 flex-shrink-0"
          >
            {t.languageSwitcher.label}
          </Link>
        </div>
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
                + {t.addScenario} {String.fromCharCode(65 + scenarios.length)}
              </button>
            )}
            <button
              onClick={resetDefaults}
              className="text-xs text-muted hover:text-label transition-colors ml-auto"
            >
              {t.reset}
            </button>
          </div>

          {/* Basic Inputs */}
          <ScenarioSlider
            label={t.referringDomainDA}
            value={inputs.referringDomainDA}
            min={1}
            max={100}
            step={1}
            benchmark={benchmarks.seo.avg_da_established}
            benchmarkLabel={t.establishedSiteAvg}
            onChange={(v) => update('referringDomainDA', v)}
            benchmarkChips={t.daChips}
          />
          <ScenarioSlider
            label={t.linkRelevance}
            value={inputs.linkRelevance}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update('linkRelevance', v)}
            benchmarkChips={t.relevanceChips}
          />
          <ScenarioSlider
            label={t.doFollowLabel}
            value={inputs.isDoFollow}
            min={0}
            max={1}
            step={1}
            onChange={(v) => update('isDoFollow', v)}
            benchmarkChips={t.doFollowChips}
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
            {showAdvanced ? t.hideAdvanced : t.showAdvanced}
          </button>

          {showAdvanced && (
            <div className="border-t border-surface-lighter pt-4 space-y-0">
              <ScenarioSlider
                label={t.monthlyReferralTraffic}
                value={inputs.referralTraffic}
                min={0}
                max={10000}
                step={10}
                onChange={(v) => update('referralTraffic', v)}
                benchmarkChips={t.trafficChips}
              />
              <ScenarioSlider
                label={t.avgTrafficValueLabel}
                value={inputs.avgTrafficValue}
                min={0.01}
                max={10}
                step={0.01}
                prefix="$"
                benchmark={benchmarks.seo.avg_organic_traffic_value_per_visit}
                benchmarkLabel={t.avgTrafficValueBenchmark}
                onChange={(v) => update('avgTrafficValue', v)}
              />
              <ScenarioSlider
                label={t.linkPlacementLabel}
                value={inputs.linkPlacement}
                min={0}
                max={100}
                step={10}
                onChange={(v) => update('linkPlacement', v)}
                benchmarkChips={t.placementChips}
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
                title={t.qualityScoreTitle}
                value={m.qualityScore.toFixed(0)}
                subtitle={m.qualityScore >= 75 ? t.qualityLabels.premium : m.qualityScore >= 50 ? t.qualityLabels.aboveAvg : m.qualityScore >= 25 ? t.qualityLabels.belowAvg : t.qualityLabels.low}
                color={m.qualityScore >= 75 ? 'green' : m.qualityScore >= 50 ? 'amber' : m.qualityScore >= 25 ? 'blue' : 'red'}
              />
              <KPICard
                title={t.monthlyValueTitle}
                value={formatCurrency(m.totalMonthlyValue)}
                subtitle={`${formatCurrency(m.monthlyReferralValue)} ${t.referralLabel} + ${formatCurrency(m.seoValue)} ${t.seoLabel}`}
                color="blue"
              />
              <KPICard
                title={t.fairPriceTitle}
                value={formatCurrency(m.fairPrice)}
                subtitle={`${t.basedOnAnnual} ${formatCurrency(m.annualValue)}`}
                color={m.fairPrice > 0 ? 'green' : 'red'}
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
                      <p className="text-[10px] text-muted uppercase">{t.qualityScoreTitle}</p>
                      <p className="font-mono text-lg font-bold" style={{ color: scenarioColors[idx] }}>
                        {s.metrics.qualityScore.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">{t.monthlyValueTitle}</p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatCurrency(s.metrics.totalMonthlyValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase">{t.fairPriceTitle}</p>
                      <p className="font-mono text-lg font-bold text-success">
                        {formatCurrency(s.metrics.fairPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <PostKPICTA toolSlug="backlink-value-calculator" />

          {/* Chart */}
          <div className="bg-surface rounded-xl border border-surface-lighter p-5 mb-6">
            <h3 className="text-sm font-medium text-label mb-3">{t.chartTitle}</h3>
            <div className="h-80 sm:h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <BenchmarkGauge
            label={t.benchmarkGaugeLabel}
            value={m.qualityScore}
            benchmark={50}
            min={0}
            max={100}
            suffix=""
            affiliateUrl={affiliateData.partners.semrush.url}
            affiliateText={t.benchmarkGaugeCTA}
          />

          <div className="flex gap-3 mt-4">
            <ShareButton slug="backlink-value-calculator" inputs={inputs} />
          </div>
        </div>
      </div>

      {/* ============ REVERSE GOAL MODE ============ */}
      {isReverse && (
        <div className="mt-8 bg-surface rounded-xl border border-accent/30 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t.reverseTitle}</h3>
          <div className="mb-4">
            <label className="text-sm text-label">{t.reverseInputLabel}</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-label">$</span>
              <input
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(parseFloat(e.target.value) || 0)}
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
                {i === 0 && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">{t.reverseSmallest}</span>}
                <h4 className="text-sm font-semibold text-foreground mt-1">{scenario.label}</h4>
                <p className="text-xs text-label mt-1">{scenario.description}</p>
                <p className="text-xs font-mono mt-2 text-label">
                  {t.changeLabel}: <span className={scenario.change > 0 ? 'text-danger' : 'text-success'}>
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
            {t.reverseClose}
          </button>
        </div>
      )}

      {/* Action Panel */}
      <ActionPanel status={actionData.status} title={actionData.title} actions={actionData.actions} />

      {/* Risk Radar */}
      <RiskRadar
        inputs={inputs}
        labels={t.riskLabels}
        calculateFn={calcProfit}
        resultLabel={t.riskResultLabel}
      />

      {/* SEO Content */}
      {t.seoContent}

      {/* FAQ */}
      <FAQSection faqs={t.faqs} />

      <FeedbackWidget toolSlug="backlink-value-calculator" />
      <PreRelatedCTA toolSlug="backlink-value-calculator" />
      {/* Related Tools */}
      <RelatedTools currentSlug="backlink-value-calculator" />
    </div>
  );
}
