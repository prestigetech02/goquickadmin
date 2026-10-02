import { Link } from 'react-router-dom';
import { getAdmin2BlogPostHref } from '@/lib/adminNavigation';
import type { BlogOverview } from '@/types/api';
import { formatCount, formatSignedPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

export function TopArticlesCard({ overview, rangeNoun, onViewAll }: { overview?: BlogOverview; rangeNoun: string; onViewAll: () => void }) {
  const articles = overview?.top_articles ?? [];

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[12px] p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Top-performing articles" subtitle={`Most-read posts ${rangeNoun}`} />
        <button type="button" onClick={onViewAll} className="flex-shrink-0 text-[11px] font-semibold text-[#167d35] hover:underline">
          View all posts
        </button>
      </div>

      <div className="flex flex-col">
        {!overview
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-[10px] border-b border-[#eef2ef] py-[10px] last:border-b-0">
                <Skeleton className="size-[22px]" />
                <Skeleton className="h-[11px] flex-1" />
                <Skeleton className="h-[11px] w-[48px]" />
              </div>
            ))
          : null}

        {overview && articles.length === 0 ? (
          <p className="py-[18px] text-center text-[11px] text-[#7c857f]">No article views recorded {rangeNoun} yet.</p>
        ) : null}

        {articles.map((article, index) => (
          <div key={article.id} className="flex items-center gap-[10px] border-b border-[#eef2ef] py-[10px] last:border-b-0">
            <span className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[#f3faf5] text-[10px] font-semibold text-[#167d35]">
              {index + 1}
            </span>
            <Link
              to={getAdmin2BlogPostHref(article.id)}
              className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#17211b] hover:text-[#167d35]"
              title={article.title}
            >
              {article.title}
            </Link>
            <div className="flex flex-shrink-0 flex-col items-end">
              <span className="text-[11px] font-semibold text-[#17211b]">{formatCount(article.views)}</span>
              {article.change_pct != null ? (
                <span className={`text-[9px] font-semibold ${article.change_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}`}>
                  {formatSignedPct(article.change_pct)}
                </span>
              ) : (
                <span className="text-[9px] text-[#7c857f]">New</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
