'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tools, categories } from '@/lib/tools-data';

export default function ToolCategoryTabs() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredTools = activeCategory === 'all'
    ? tools
    : tools.filter(t => t.categorySlug === activeCategory);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-accent text-white'
              : 'bg-surface text-label hover:text-foreground border border-surface-lighter'
          }`}
        >
          All Tools ({tools.length})
        </button>
        {categories.map(cat => {
          const count = tools.filter(t => t.categorySlug === cat.slug).length;
          return (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.slug
                  ? 'bg-accent text-white'
                  : 'bg-surface text-label hover:text-foreground border border-surface-lighter'
              }`}
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map(tool => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group p-5 bg-surface rounded-xl border border-surface-lighter hover:border-accent/30 transition-all hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{tool.icon}</span>
              <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                {tool.name}
              </h3>
            </div>
            <p className="text-sm text-label line-clamp-2">{tool.description}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Open tool <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
