'use client';

import { useEffect, useState } from 'react';

interface StatsSummary {
  totalEpisodes: number;
  totalSeasons: number;
  totalFormats: number;
  collection: string;
}

interface CountItem {
  name: string;
  count: number;
}

interface EpisodeItem {
  id: number;
  title: string;
  season: string;
  format: string;
}

interface StatsData {
  summary: StatsSummary;
  seasonCounts: CountItem[];
  formatCounts: CountItem[];
  recentEpisodes: EpisodeItem[];
}

interface StatsPanelProps {
  isExpanded: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card animate-pulse">
          <div className="h-6 w-24 bg-zinc-700/40 rounded mb-3" />
          <div className="h-3 w-16 bg-zinc-700/30 rounded mb-4" />
          <div className="space-y-2">
            {[...Array(4)].map((__, j) => (
              <div key={j} className="h-3 bg-zinc-700/20 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BarList({
  data,
}: {
  data: CountItem[];
}) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(item => item.count), 1);

  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{item.name}</span>
            <span className="text-zinc-500 font-mono">{item.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentList({ data }: { data: EpisodeItem[] }) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      {data.slice(0, 6).map(item => (
        <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="text-zinc-300 truncate">{item.title}</div>
            <div className="text-zinc-500 font-mono uppercase tracking-wider">
              {item.season} · {item.format}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsPanel({ isExpanded }: StatsPanelProps) {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!isExpanded || data) return;

    let cancelled = false;

    fetch('/api/stats')
      .then(res => res.json())
      .then((payload: StatsData) => {
        if (!cancelled) setData(payload);
      })
      .catch(err => {
        console.error('Failed to load stats:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [data, isExpanded]);

  if (!isExpanded) {
    return null;
  }

  if (!data) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stats-grid">
      <div className="stat-card">
        <div className="text-3xl font-semibold text-white">{data.summary.totalEpisodes.toLocaleString()}</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-1">Cases indexed</div>
        <div className="mt-4 text-sm text-zinc-400">
          Real Undisclosed case entries from the official cases index.
        </div>
      </div>

      <div className="stat-card">
        <div className="text-3xl font-semibold text-white">{data.summary.totalSeasons}</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-1">Seasons covered</div>
        <div className="mt-4 text-sm text-zinc-400">
          Season 7 back through Season 1.
        </div>
      </div>

      <div className="stat-card">
        <div className="text-3xl font-semibold text-white">{data.summary.totalFormats}</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-1">Formats tracked</div>
        <div className="mt-4">
          <BarList data={data.formatCounts} />
        </div>
      </div>

      <div className="stat-card">
        <div className="text-lg font-semibold text-white">Recent entries</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-1">Latest in source order</div>
        <div className="mt-4">
          <RecentList data={data.recentEpisodes} />
        </div>
      </div>

      <div className="md:col-span-2 lg:col-span-4 stat-card">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-lg font-semibold text-white">Season breakdown</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-1">
              Official Undisclosed case groups
            </div>
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
            {data.summary.collection}
          </div>
        </div>
        <BarList data={data.seasonCounts} />
      </div>
    </div>
  );
}
