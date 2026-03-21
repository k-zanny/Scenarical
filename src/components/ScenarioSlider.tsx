'use client';

import { useId, useState } from 'react';

export interface BenchmarkChip {
  label: string;
  value: number;
}

interface ScenarioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  benchmark?: number;
  benchmarkLabel?: string;
  benchmarkChips?: BenchmarkChip[];
  onChange: (value: number) => void;
}

export default function ScenarioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  prefix = '',
  suffix = '',
  benchmark,
  benchmarkLabel,
  benchmarkChips,
  onChange,
}: ScenarioSliderProps) {
  const id = useId();
  const [rawInput, setRawInput] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawInput(raw);
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      onChange(v);
    }
  };

  const handleBlur = () => {
    setRawInput(null);
    if (value < min) onChange(min);
    else if (value > max) onChange(max);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const displayInputValue = rawInput !== null ? rawInput : value;

  return (
    <div className="mb-5">
      <div className="flex flex-wrap justify-between items-center gap-y-1 mb-2">
        <label htmlFor={id} className="text-sm font-medium text-label min-w-0">
          {label}
        </label>
        <div className="flex items-center gap-2 shrink-0">
          {prefix && <span className="text-xs text-muted font-mono">{prefix.trim()}</span>}
          <input
            type="number"
            value={displayInputValue}
            step={step}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className="w-32 bg-surface-light border border-surface-lighter rounded-lg px-3 py-1.5 text-right font-mono text-sm text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          />
          {suffix && <span className="text-xs text-muted font-mono">{suffix}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => { setRawInput(null); onChange(parseFloat(e.target.value)); }}
        className="w-full touch-pan-y"
        style={{
          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100}%, #1E2536 ${((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100}%, #1E2536 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {benchmark !== undefined && (
          <button
            onClick={() => onChange(benchmark)}
            className="inline-flex items-center gap-1 text-xs text-accent/80 hover:text-accent bg-accent/10 hover:bg-accent/20 rounded-full px-2.5 py-0.5 transition-colors cursor-pointer"
            title="Click to apply this benchmark value"
          >
            <span className="w-3 h-3 rounded-full bg-accent/30 flex items-center justify-center text-[8px] font-bold">i</span>
            {benchmarkLabel || 'Industry avg'}: {prefix}{benchmark.toLocaleString()}{suffix}
          </button>
        )}
        {benchmarkChips?.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onChange(chip.value)}
            className="text-xs text-label/70 hover:text-label bg-surface-lighter/50 hover:bg-surface-lighter rounded-full px-2.5 py-0.5 transition-colors cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
