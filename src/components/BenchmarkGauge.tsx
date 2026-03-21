'use client';

interface BenchmarkGaugeProps {
  label: string;
  value: number;
  benchmark: number;
  min?: number;
  max?: number;
  suffix?: string;
  prefix?: string;
}

export default function BenchmarkGauge({
  label,
  value,
  benchmark,
  min = 0,
  max,
  suffix = '',
  prefix = '',
}: BenchmarkGaugeProps) {
  const effectiveMax = max || benchmark * 3;
  const valuePos = Math.min(((value - min) / (effectiveMax - min)) * 100, 100);
  const benchmarkPos = ((benchmark - min) / (effectiveMax - min)) * 100;

  const getStatus = () => {
    const ratio = value / benchmark;
    if (ratio >= 1.5) return { text: 'Top Performer', color: 'text-success', badge: 'bg-success/20 text-success' };
    if (ratio >= 1.0) return { text: 'Above Average', color: 'text-success', badge: 'bg-success/20 text-success' };
    if (ratio >= 0.7) return { text: 'On Track', color: 'text-warning', badge: 'bg-warning/20 text-warning' };
    return { text: 'Below Average', color: 'text-danger', badge: 'bg-danger/20 text-danger' };
  };

  const status = getStatus();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-label">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
          {status.text}
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 35%, #10B981 70%, #10B981 100%)',
          opacity: 0.3,
        }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${valuePos}%`,
            background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 35%, #10B981 70%, #10B981 100%)',
          }}
        />
      </div>
      <div className="relative h-4 mt-0.5">
        <div
          className="absolute -top-1 w-0.5 h-5 bg-foreground/50"
          style={{ left: `${benchmarkPos}%` }}
        >
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap">
            Avg: {prefix}{benchmark.toLocaleString()}{suffix}
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-muted">Your value: <span className="font-mono text-foreground">{prefix}{value.toLocaleString()}{suffix}</span></span>
      </div>
    </div>
  );
}
