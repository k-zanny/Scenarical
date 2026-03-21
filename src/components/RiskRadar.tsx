'use client';

import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { formatCurrency } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface RiskRadarProps {
  inputs: Record<string, number>;
  labels: Record<string, string>;
  calculateFn: (inputs: Record<string, number>) => number;
  resultLabel?: string;
  resultPrefix?: string;
}

const variationOptions = [
  { label: '±10%', value: 10 },
  { label: '±20%', value: 20 },
  { label: '±30%', value: 30 },
];

export default function RiskRadar({
  inputs,
  labels,
  calculateFn,
  resultLabel = 'profit',
  resultPrefix = '$',
}: RiskRadarProps) {
  const [variationPct, setVariationPct] = useState(15);
  const baseResult = calculateFn(inputs);
  const variables = Object.keys(labels);

  const sensitivities = variables.map(key => {
    const factor = 1 - variationPct / 100;
    const modified = { ...inputs, [key]: inputs[key] * factor };
    const newResult = calculateFn(modified);
    const absChange = newResult - baseResult;
    return { key, label: labels[key], absChange };
  }).sort((a, b) => Math.abs(b.absChange) - Math.abs(a.absChange));

  const mostVulnerable = sensitivities[0];

  const chartData = {
    labels: sensitivities.map(s => s.label),
    datasets: [{
      label: `Impact of -${variationPct}% change`,
      data: sensitivities.map(s => s.absChange),
      backgroundColor: sensitivities.map(s =>
        s.absChange < -100 ? 'rgba(239, 68, 68, 0.7)' :
        s.absChange < 0 ? 'rgba(245, 158, 11, 0.7)' :
        'rgba(16, 185, 129, 0.7)'
      ),
      borderColor: sensitivities.map(s =>
        s.absChange < -100 ? '#EF4444' :
        s.absChange < 0 ? '#F59E0B' :
        '#10B981'
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141926',
        borderColor: '#283044',
        borderWidth: 1,
        titleColor: '#E8ECF4',
        bodyColor: '#94A3B8',
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const val = ctx.raw as number;
            const varLabel = sensitivities[ctx.dataIndex]?.label || '';
            return `${varLabel} -${variationPct}% → ${resultLabel} ${val >= 0 ? '+' : ''}${resultPrefix}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(40, 48, 68, 0.5)' },
        ticks: {
          color: '#94A3B8',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => `${resultPrefix}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        },
        title: { display: true, text: `Impact on ${resultLabel} (${resultPrefix})`, color: '#94A3B8' },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#E8ECF4', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-5 mt-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h3 className="text-lg font-semibold text-foreground">Risk Radar</h3>
        </div>
        <div className="flex gap-1">
          {variationOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setVariationPct(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                variationPct === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-label hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-label mb-4">
        What happens to your {resultLabel} if each variable drops by {variationPct}%?
      </p>
      <div className="h-56">
        <Bar data={chartData} options={chartOptions} />
      </div>
      {mostVulnerable && Math.abs(mostVulnerable.absChange) > 0 && (
        <div className={`mt-4 p-3 rounded-lg ${mostVulnerable.absChange < 0 ? 'bg-danger/10 border border-danger/20' : 'bg-success/10 border border-success/20'}`}>
          <p className="text-sm text-foreground">
            <span className="font-semibold">⚠️ {mostVulnerable.label}</span> is your most sensitive variable.
            A {variationPct}% decrease would change {resultLabel} by{' '}
            <span className="font-mono font-semibold">{formatCurrency(mostVulnerable.absChange)}</span>
            {mostVulnerable.absChange < 0 && baseResult + mostVulnerable.absChange * 2 < 0 && (
              <span className="text-danger"> — a {variationPct * 2}% drop could push you into the red.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
