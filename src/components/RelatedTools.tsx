import Link from 'next/link';
import { getRelatedTools } from '@/lib/tools-data';

interface RelatedToolsProps {
  currentSlug: string;
}

export default function RelatedTools({ currentSlug }: RelatedToolsProps) {
  const related = getRelatedTools(currentSlug);
  if (related.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-surface-lighter">
      <h2 className="text-xl font-semibold text-foreground mb-4">Related Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map(tool => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group p-4 bg-surface rounded-xl border border-surface-lighter hover:border-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{tool.icon}</span>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                {tool.name}
              </h3>
            </div>
            <p className="text-xs text-label line-clamp-2">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
