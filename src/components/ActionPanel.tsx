'use client';

import Link from 'next/link';

export interface Action {
  icon: string;
  text: string;
  link?: string;
  affiliateText?: string;
  affiliateUrl?: string;
}

interface ActionPanelProps {
  status: 'danger' | 'warning' | 'good' | 'excellent';
  title: string;
  actions: Action[];
}

const statusConfig = {
  danger: {
    bg: 'bg-danger/10 border-danger/20',
    icon: '⚠️',
    badge: 'bg-danger/20 text-danger',
    badgeText: 'Action Required',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/20',
    icon: '📊',
    badge: 'bg-warning/20 text-warning',
    badgeText: 'On Track',
  },
  good: {
    bg: 'bg-success/10 border-success/20',
    icon: '✅',
    badge: 'bg-success/20 text-success',
    badgeText: 'Performing Well',
  },
  excellent: {
    bg: 'bg-success/10 border-success/20',
    icon: '🏆',
    badge: 'bg-success/20 text-success',
    badgeText: 'Top Performer',
  },
};

export default function ActionPanel({ status, title, actions }: ActionPanelProps) {
  const config = statusConfig[status];

  return (
    <div className={`rounded-xl border p-5 mt-6 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.icon}</span>
        <h3 className="text-lg font-semibold text-foreground">Recommended Actions</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${config.badge}`}>
          {config.badgeText}
        </span>
      </div>
      <p className="text-sm text-label mb-4">{title}</p>
      <div className="space-y-3">
        {actions.map((action, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-surface/50 rounded-lg">
            <span className="text-base mt-0.5">{action.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">{action.text}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {action.link && (
                  <Link
                    href={action.link}
                    className="inline-block text-xs px-3 py-1.5 rounded border border-[#3B4A60] text-[#94A3B8] hover:text-white hover:border-[#5B6A80] transition-colors"
                  >
                    Open related tool →
                  </Link>
                )}
                {action.affiliateText && (
                  <a
                    href={action.affiliateUrl || '#'}
                    className="inline-block bg-[#3B82F6] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#2563EB] transition-colors"
                    target="_blank"
                    rel="sponsored noopener"
                  >
                    {action.affiliateText}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
