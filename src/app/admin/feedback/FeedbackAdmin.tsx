'use client';

import { useState, useEffect } from 'react';

interface FeedbackEntry {
  id: string;
  tool_slug: string;
  message: string;
  email: string | null;
  created_at: string;
  user_agent: string;
  url: string;
}

export default function FeedbackAdmin() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feedback')
      .then(r => r.json())
      .then(data => {
        setFeedback(Array.isArray(data) ? data.reverse() : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toolSlugs = Array.from(new Set(feedback.map(f => f.tool_slug))).sort();
  const filtered = filter === 'all' ? feedback : feedback.filter(f => f.tool_slug === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Feedback ({feedback.length})</h1>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg ${
            filter === 'all' ? 'bg-accent text-white' : 'bg-surface text-label border border-surface-lighter'
          }`}
        >
          All ({feedback.length})
        </button>
        {toolSlugs.map(slug => (
          <button
            key={slug}
            onClick={() => setFilter(slug)}
            className={`text-xs px-3 py-1.5 rounded-lg ${
              filter === slug ? 'bg-accent text-white' : 'bg-surface text-label border border-surface-lighter'
            }`}
          >
            {slug} ({feedback.filter(f => f.tool_slug === slug).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-label text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-label text-sm">No feedback yet.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-surface rounded-xl border border-surface-lighter p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {entry.tool_slug}
                </span>
                <span className="text-xs text-muted">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                {entry.email && (
                  <a href={`mailto:${entry.email}`} className="text-xs text-accent hover:underline ml-auto">
                    {entry.email}
                  </a>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.message}</p>
              <p className="text-[10px] text-muted mt-3 truncate">{entry.url}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
