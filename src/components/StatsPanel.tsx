'use client';

import { useState, useEffect } from 'react';

interface StatsSummary {
  totalEpisodes: number;
  totalHours: number;
  avgDuration: number;
  dateRange: { start: string; end: string };
}

interface MonthlyData {
  month: string;
  episodeCount: number;
  totalMinutes: number;
  avgMinutes: number;
}

interface GuestCount {
  name: string;
  count: number;
}

interface CompanyCount {
  name: string;
  count: number;
}

interface YearlyData {
  year: string;
  episodeCount: number;
  totalHours: number;
  avgMinutes: number;
}

interface TitleCount {
  title: string;
  count: number;
}

interface DurationBucket {
  bucket: string;
  count: number;
  minMinutes: number;
  maxMinutes: number;
}

interface LongestEpisode {
  id: number;
  title: string;
  guest: string;
  durationMinutes: number;
  pubDate: string;
}

interface StatsData {
  summary: StatsSummary;
  timeline: MonthlyData[];
  topGuests: GuestCount[];
  topCompanies: CompanyCount[];
  yearlyStats: YearlyData[];
  topTitles: TitleCount[];
  durationDistribution: DurationBucket[];
  longestEpisodes: LongestEpisode[];
}

interface StatsPanelProps {
  isExpanded: boolean;
  activeGuest: string | null;
  activeCompany: string | null;
  onGuestSelect: (name: string | null) => void;
  onCompanySelect: (name: string | null) => void;
}

// Area Chart for Episode Timeline
function AreaChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return null;

  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map(d => d.episodeCount));
  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - (d.episodeCount / maxCount) * chartHeight
  }));

  const areaPath = `
    M ${padding.left} ${padding.top + chartHeight}
    ${points.map(p => `L ${p.x} ${p.y}`).join(' ')}
    L ${padding.left + chartWidth} ${padding.top + chartHeight}
    Z
  `;

  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const years = [...new Set(data.map(d => d.month.slice(0, 4)))];
  const yearPositions = years.map(year => {
    const idx = data.findIndex(d => d.month.startsWith(year));
    return {
      year,
      x: padding.left + (idx / (data.length - 1)) * chartWidth
    };
  }).filter((_, i) => i % 2 === 0 || years.length <= 6);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill="url(#areaGradient)" className="area-chart-fill" />
      <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" filter="url(#glow)" className="area-chart-line" />
      {yearPositions.map(({ year, x }) => (
        <text key={year} x={x} y={height - 4} fill="#71717a" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono-custom)">
          {year.slice(2)}
        </text>
      ))}
    </svg>
  );
}

// Line Chart for Runtime Trend
function LineChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return null;

  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const avgDurations = data.map(d => d.avgMinutes);
  const maxDuration = Math.max(...avgDurations);
  const minDuration = Math.min(...avgDurations);
  const range = maxDuration - minDuration || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.avgMinutes - minDuration) / range) * chartHeight * 0.8 - chartHeight * 0.1
  }));

  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const refY = padding.top + chartHeight - ((40 - minDuration) / range) * chartHeight * 0.8 - chartHeight * 0.1;

  const years = [...new Set(data.map(d => d.month.slice(0, 4)))];
  const yearPositions = years.map(year => {
    const idx = data.findIndex(d => d.month.startsWith(year));
    return { year, x: padding.left + (idx / (data.length - 1)) * chartWidth };
  }).filter((_, i) => i % 2 === 0 || years.length <= 6);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="cyanGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line x1={padding.left} y1={refY} x2={width - padding.right} y2={refY} stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
      <text x={width - padding.right} y={refY - 4} fill="#52525b" fontSize="8" textAnchor="end" fontFamily="var(--font-mono-custom)">40m</text>
      <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="2" filter="url(#cyanGlow)" className="line-chart-path" />
      {yearPositions.map(({ year, x }) => (
        <text key={year} x={x} y={height - 4} fill="#71717a" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono-custom)">
          {year.slice(2)}
        </text>
      ))}
    </svg>
  );
}

// Vertical Bar Chart for Episodes per Year
function VerticalBarChart({ data }: { data: YearlyData[] }) {
  if (data.length === 0) return null;

  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map(d => d.episodeCount));
  const barWidth = (chartWidth / data.length) * 0.7;
  const gap = (chartWidth / data.length) * 0.3;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="barGradientV" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barHeight = (d.episodeCount / maxCount) * chartHeight;
        const x = padding.left + i * (barWidth + gap) + gap / 2;
        const y = padding.top + chartHeight - barHeight;

        return (
          <g key={d.year}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="url(#barGradientV)"
              rx="2"
              className="vertical-bar"
              style={{ animationDelay: `${i * 0.05}s` }}
            />
            <text
              x={x + barWidth / 2}
              y={height - 4}
              fill="#71717a"
              fontSize="8"
              textAnchor="middle"
              fontFamily="var(--font-mono-custom)"
            >
              {d.year.slice(2)}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 4}
              fill="#a1a1aa"
              fontSize="7"
              textAnchor="middle"
              fontFamily="var(--font-mono-custom)"
            >
              {d.episodeCount}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Duration Distribution Chart
function DurationChart({ data }: { data: DurationBucket[] }) {
  if (data.length === 0) return null;

  const width = 280;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map(d => d.count));
  const barWidth = (chartWidth / data.length) * 0.75;
  const gap = (chartWidth / data.length) * 0.25;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="durationGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barHeight = (d.count / maxCount) * chartHeight;
        const x = padding.left + i * (barWidth + gap) + gap / 2;
        const y = padding.top + chartHeight - barHeight;

        return (
          <g key={d.bucket}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="url(#durationGradient)"
              rx="2"
              className="vertical-bar"
              style={{ animationDelay: `${i * 0.05}s` }}
            />
            <text
              x={x + barWidth / 2}
              y={height - 4}
              fill="#71717a"
              fontSize="8"
              textAnchor="middle"
              fontFamily="var(--font-mono-custom)"
            >
              {d.bucket}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 4}
              fill="#a1a1aa"
              fontSize="7"
              textAnchor="middle"
              fontFamily="var(--font-mono-custom)"
            >
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Horizontal Bar Chart with clickable items
function HorizontalBarChart({
  data,
  colorStart,
  colorEnd,
  activeItem,
  onItemClick
}: {
  data: { name: string; count: number }[];
  colorStart: string;
  colorEnd: string;
  activeItem?: string | null;
  onItemClick?: (name: string | null) => void;
}) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const items = data.slice(0, 8);
  const isClickable = !!onItemClick;

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const percentage = (item.count / maxCount) * 100;
        const isActive = activeItem === item.name;
        const displayName = item.name.length > 18 ? item.name.slice(0, 16) + '...' : item.name;

        const content = (
          <>
            <span
              className={`w-24 truncate text-left transition-colors ${
                isActive ? 'text-white font-medium' : 'text-zinc-400'
              }`}
              title={item.name}
            >
              {displayName}
            </span>
            <div className="flex-1 h-3 bg-zinc-800/50 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm bar-chart-bar ${isActive ? 'bar-active' : ''}`}
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${colorStart}, ${colorEnd})`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            </div>
            <span className={`w-6 text-right font-mono text-[10px] transition-colors ${
              isActive ? 'text-zinc-300' : 'text-zinc-500'
            }`}>
              {item.count}
            </span>
          </>
        );

        if (isClickable) {
          return (
            <button
              key={i}
              onClick={() => onItemClick(isActive ? null : item.name)}
              className={`
                w-full flex items-center gap-2 text-xs rounded-sm px-1 py-0.5 -mx-1
                transition-all duration-200 cursor-pointer hover:bg-zinc-700/30
                ${isActive ? 'bg-zinc-700/50 ring-1 ring-violet-500/50' : ''}
              `}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            {content}
          </div>
        );
      })}
    </div>
  );
}

// Longest Episodes List
function LongestEpisodesList({ data }: { data: LongestEpisode[] }) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {data.slice(0, 6).map((ep, i) => {
        const hours = Math.floor(ep.durationMinutes / 60);
        const mins = Math.round(ep.durationMinutes % 60);
        const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const displayTitle = ep.title.length > 28 ? ep.title.slice(0, 26) + '...' : ep.title;

        return (
          <div key={ep.id} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-zinc-600 font-mono">{i + 1}.</span>
            <span className="flex-1 truncate text-zinc-400" title={ep.title}>
              {displayTitle}
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">{duration}</span>
          </div>
        );
      })}
    </div>
  );
}

// Stat Card wrapper
function StatCard({
  headline,
  label,
  children,
  isClickable,
  isActive,
  onClick
}: {
  headline: string | number;
  label: string;
  children: React.ReactNode;
  isClickable?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const HeadlineWrapper = isClickable ? 'button' : 'div';

  return (
    <div className={`stat-card ${isActive ? 'stat-card-active' : ''}`}>
      <div className="mb-3">
        <HeadlineWrapper
          className={`stat-headline ${isClickable ? 'stat-headline-clickable' : ''}`}
          onClick={isClickable ? onClick : undefined}
        >
          {headline}
        </HeadlineWrapper>
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
          {label}
        </div>
      </div>
      {children}
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card animate-pulse">
          <div className="mb-3">
            <div className="h-8 w-24 bg-zinc-700/50 rounded mb-1" />
            <div className="h-3 w-16 bg-zinc-700/30 rounded" />
          </div>
          <div className="h-24 bg-zinc-700/20 rounded" />
        </div>
      ))}
    </div>
  );
}

// Navigation Arrow
function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="stats-nav-arrow"
      aria-label={direction === 'left' ? 'Previous page' : 'Next page'}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={direction === 'left' ? 'rotate-180' : ''}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

export function StatsPanel({
  isExpanded,
  activeGuest,
  activeCompany,
  onGuestSelect,
  onCompanySelect
}: StatsPanelProps) {
  const [data, setData] = useState<StatsData | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = 2;

  // Lazy load data when expanded for the first time
  useEffect(() => {
    if (!isExpanded || fetchState !== 'idle') return;

    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard data fetching pattern
    setFetchState('loading');
    fetch('/api/stats')
      .then(res => res.json())
      .then(statsData => {
        if (!cancelled) {
          setData(statsData);
          setFetchState('done');
        }
      })
      .catch(err => {
        console.error('Failed to load stats:', err);
        if (!cancelled) {
          setFetchState('error');
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchState intentionally omitted to prevent race condition
  }, [isExpanded]);

  if (fetchState === 'loading' || fetchState === 'idle' || !data) {
    return <LoadingSkeleton />;
  }

  const topGuest = data.topGuests[0];
  const topCompany = data.topCompanies[0];
  const topTitle = data.topTitles[0];
  const longestEp = data.longestEpisodes[0];

  // Calculate peak year
  const peakYear = data.yearlyStats.reduce((max, y) =>
    y.episodeCount > max.episodeCount ? y : max
  , data.yearlyStats[0]);

  return (
    <div className="relative">
      {/* Page indicator dots */}
      <div className="flex justify-center gap-2 mb-3">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentPage === i
                ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            aria-label={`Go to page ${i + 1}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        {/* Left Arrow */}
        <div className="w-8 flex-shrink-0">
          {currentPage > 0 && (
            <NavArrow direction="left" onClick={() => setCurrentPage(p => p - 1)} />
          )}
        </div>

        {/* Stats Grid */}
        <div className="flex-1 min-w-0">
          {currentPage === 0 ? (
            // Page 1: Original stats
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stats-grid">
              <StatCard headline={data.summary.totalEpisodes.toLocaleString()} label="Episodes">
                <AreaChart data={data.timeline} />
              </StatCard>

              <StatCard headline={`${data.summary.totalHours}+`} label="Total Hours">
                <LineChart data={data.timeline} />
              </StatCard>

              <StatCard
                headline={topGuest?.name || 'N/A'}
                label="#1 Guest"
                isClickable={!!topGuest}
                isActive={activeGuest === topGuest?.name}
                onClick={() => onGuestSelect(activeGuest === topGuest?.name ? null : topGuest?.name)}
              >
                <HorizontalBarChart
                  data={data.topGuests}
                  colorStart="#8b5cf6"
                  colorEnd="#22d3ee"
                  activeItem={activeGuest}
                  onItemClick={onGuestSelect}
                />
              </StatCard>

              <StatCard
                headline={topCompany?.name || 'N/A'}
                label="#1 Company"
                isClickable={!!topCompany}
                isActive={activeCompany === topCompany?.name}
                onClick={() => onCompanySelect(activeCompany === topCompany?.name ? null : topCompany?.name)}
              >
                <HorizontalBarChart
                  data={data.topCompanies}
                  colorStart="#22d3ee"
                  colorEnd="#8b5cf6"
                  activeItem={activeCompany}
                  onItemClick={onCompanySelect}
                />
              </StatCard>
            </div>
          ) : (
            // Page 2: New stats
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stats-grid">
              <StatCard headline={peakYear?.year || 'N/A'} label="Peak Year">
                <VerticalBarChart data={data.yearlyStats} />
              </StatCard>

              <StatCard headline="40-50 min" label="Most Common Length">
                <DurationChart data={data.durationDistribution} />
              </StatCard>

              <StatCard headline={topTitle?.title || 'N/A'} label="#1 Title">
                <HorizontalBarChart
                  data={data.topTitles.map(t => ({ name: t.title, count: t.count }))}
                  colorStart="#8b5cf6"
                  colorEnd="#22d3ee"
                />
              </StatCard>

              <StatCard
                headline={longestEp ? `${Math.round(longestEp.durationMinutes)}m` : 'N/A'}
                label="Longest Episode"
              >
                <LongestEpisodesList data={data.longestEpisodes} />
              </StatCard>
            </div>
          )}
        </div>

        {/* Right Arrow */}
        <div className="w-8 flex-shrink-0">
          {currentPage < totalPages - 1 && (
            <NavArrow direction="right" onClick={() => setCurrentPage(p => p + 1)} />
          )}
        </div>
      </div>
    </div>
  );
}
