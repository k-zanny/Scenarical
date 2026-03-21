'use client';

import { useState, useRef } from 'react';

interface FeedbackWidgetProps {
  toolSlug?: string;
}

export default function FeedbackWidget({ toolSlug }: FeedbackWidgetProps) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const lastSentRef = useRef<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Rate limit: 1 per minute
    const now = Date.now();
    if (now - lastSentRef.current < 60000) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_slug: toolSlug || 'homepage',
          message: message.trim(),
          email: email.trim() || null,
          url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setStatus('sent');
        lastSentRef.current = now;
        setMessage('');
        setEmail('');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="mt-12 bg-surface rounded-xl border border-surface-lighter p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Help us make this tool better
      </h3>
      <p className="text-sm text-label mb-5">
        We built Scenarical to help marketers make smarter decisions.
        If something feels off, we&apos;d love to hear about it.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What would make this tool more useful?"
          rows={3}
          required
          className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none mb-3"
        />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-xs text-muted mb-1 block">(Optional) Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'sending' || status === 'sent'}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              status === 'sent'
                ? 'bg-success/20 text-success'
                : status === 'error'
                ? 'bg-danger/20 text-danger'
                : 'bg-accent hover:bg-accent-hover text-white'
            } disabled:opacity-60`}
          >
            {status === 'sending' && 'Sending...'}
            {status === 'sent' && '✓ Thanks for your feedback!'}
            {status === 'error' && 'Please wait a moment'}
            {status === 'idle' && 'Send Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}
