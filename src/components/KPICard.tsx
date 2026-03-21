'use client';

import { useState } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'amber' | 'red';
  clickable?: boolean;
  onGoalSubmit?: (goalValue: number) => void;
}

const colorMap = {
  blue: 'border-accent/30 bg-accent/5',
  green: 'border-success/30 bg-success/5',
  amber: 'border-warning/30 bg-warning/5',
  red: 'border-danger/30 bg-danger/5',
};

const valueColorMap = {
  blue: 'text-accent',
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-danger',
};

const trendIcons = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  color = 'blue',
  clickable = false,
  onGoalSubmit,
}: KPICardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (clickable && onGoalSubmit) {
      setIsEditing(true);
      setGoalInput('');
    }
  };

  const handleSubmit = () => {
    const num = parseFloat(goalInput.replace(/[^0-9.\-]/g, ''));
    if (onGoalSubmit && !isNaN(num)) {
      onGoalSubmit(num);
    }
    setIsEditing(false);
    setGoalInput('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setGoalInput('');
  };

  return (
    <div
      className={`kpi-card rounded-xl border p-5 transition-all ${colorMap[color]} ${
        clickable ? 'cursor-pointer' : ''
      } ${clickable && hovered ? 'border-accent shadow-md shadow-accent/10' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className="text-xs font-medium text-label uppercase tracking-wider mb-2">{title}</p>

      {isEditing ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Enter target..."
            className="flex-1 bg-surface-light border border-accent rounded px-2 py-1 font-mono text-lg text-foreground outline-none min-w-0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-accent rounded text-sm text-white shrink-0"
          >
            Go
          </button>
        </div>
      ) : (
        <p className={`font-mono text-2xl font-bold ${valueColorMap[color]}`}>
          {value}
          {trend && (
            <span className="text-sm ml-2 opacity-70">{trendIcons[trend]}</span>
          )}
        </p>
      )}

      {subtitle && !isEditing && <p className="text-xs text-muted mt-1">{subtitle}</p>}

      {clickable && !isEditing && (
        <p className="text-xs mt-2 text-accent hover:text-accent-hover transition-colors cursor-pointer">
          🎯 Set a target →
        </p>
      )}
    </div>
  );
}
