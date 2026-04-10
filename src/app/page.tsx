'use client';

import { useState, useEffect, useCallback } from 'react';
import { EpisodeGrid } from '@/components/EpisodeGrid';
import { SearchBar } from '@/components/SearchBar';
import { CategoryPills } from '@/components/CategoryPills';
import { FormatPills } from '@/components/FormatPills';
import { EpisodeDrawer } from '@/components/EpisodeDrawer';
import { StatsPanel } from '@/components/StatsPanel';
import { getGradientColor } from '@/lib/categories';
import type { Episode, EpisodeWithHighlight } from '@/types/episode';

interface FormatCount {
  name: string;
  count: number;
  episodeIds: number[];
}

export default function Home() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Map<number, string>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [formatsExpanded, setFormatsExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [excludedFormats, setExcludedFormats] = useState<Set<string>>(new Set());
  const [excludeMode, setExcludeMode] = useState(false);
  const [formatCounts, setFormatCounts] = useState<FormatCount[]>([]);

  // Load all episodes on mount
  useEffect(() => {
    fetch('/api/episodes')
      .then(res => res.json())
      .then(data => {
        setEpisodes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load episodes:', err);
        setLoading(false);
      });
  }, []);

  // Load format counts for exclusion calculations
  useEffect(() => {
    fetch('/api/format-counts')
      .then(res => res.json())
      .then((data: FormatCount[]) => {
        setFormatCounts(data);
      })
      .catch(err => console.error('Failed to load format counts:', err));
  }, []);

  // Helper to apply highlights from results
  const applyHighlights = (results: Episode[]) => {
    const newHighlights = new Map<number, string>();
    results.forEach((ep, index) => {
      newHighlights.set(ep.id, getGradientColor(index, results.length));
    });
    setHighlightedIds(newHighlights);
    setResultCount(results.length);
  };

  const clearHighlights = () => {
    setHighlightedIds(new Map());
    setResultCount(0);
  };

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setActiveCategory(null);
    setActiveFormat(null);

    if (!query.trim()) {
      clearHighlights();
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const results: Episode[] = await res.json();
      applyHighlights(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback(async (categoryName: string | null) => {
    setActiveCategory(categoryName);
    setActiveFormat(null);
    setSearchQuery('');

    if (!categoryName) {
      clearHighlights();
      return;
    }

    try {
      const res = await fetch(`/api/category?name=${encodeURIComponent(categoryName)}`);
      const data = await res.json();
      applyHighlights(data.episodes);
    } catch (err) {
      console.error('Category fetch failed:', err);
    }
  }, []);

  // Handle format selection
  const handleFormatSelect = useCallback(async (formatName: string | null) => {
    setActiveFormat(formatName);
    setActiveCategory(null);
    setSearchQuery('');

    if (!formatName) {
      clearHighlights();
      return;
    }

    try {
      const res = await fetch(`/api/format?name=${encodeURIComponent(formatName)}`);
      const data = await res.json();
      applyHighlights(data.episodes);
    } catch (err) {
      console.error('Format fetch failed:', err);
    }
  }, []);

  // Handle episode selection (toggle)
  const handleSelectEpisode = useCallback((episode: EpisodeWithHighlight) => {
    if (selectedEpisode?.id === episode.id) {
      setSelectedEpisode(null);
    } else {
      setSelectedEpisode(episode);
    }
  }, [selectedEpisode]);

  // Close drawer
  const handleCloseDrawer = useCallback(() => {
    setSelectedEpisode(null);
  }, []);

  // Merge episodes with highlight state
  const episodesWithHighlight: EpisodeWithHighlight[] = episodes.map(ep => ({
    ...ep,
    highlighted: highlightedIds.has(ep.id),
    color: highlightedIds.get(ep.id),
  }));

  // Calculate excluded episode count
  const excludedEpisodeIds = new Set<number>();
  formatCounts.forEach(fc => {
    if (excludedFormats.has(fc.name)) {
      fc.episodeIds.forEach(id => excludedEpisodeIds.add(id));
    }
  });
  const excludedCount = excludedEpisodeIds.size;

  const totalEpisodes = episodes.length;
  const adjustedTotal = totalEpisodes - excludedCount;
  const baseForPercentage = excludeMode && excludedCount > 0 ? adjustedTotal : totalEpisodes;
  const percentage = baseForPercentage > 0 ? ((resultCount / baseForPercentage) * 100).toFixed(1) : '0';
  const hasResults = resultCount > 0 && (searchQuery || activeCategory || activeFormat);

  if (loading) {
    return (
      <div className="min-h-screen dashboard-bg flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="loading-grid" style={{ gridTemplateColumns: 'repeat(20, 8px)', gridAutoRows: '8px' }}>
            {Array.from({ length: 200 }).map((_, i) => (
              <div
                key={i}
                className="loading-cell"
                style={{ animationDelay: `${(i % 20) * 0.05}s` }}
              />
            ))}
          </div>
          <p className="text-zinc-500 text-sm font-mono tracking-wider">LOADING CASES...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen dashboard-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-8 lg:px-16 xl:px-24 pt-8 pb-4 space-y-5">
        {/* Title Row */}
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-baseline gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.8),0_0_24px_rgba(139,92,246,0.4)]" />
              <div className="title-glow-wrapper">
                <h1 className="text-3xl font-bold title-gradient tracking-tight">
                  Undisclosed
                </h1>
              </div>
            </div>
            <span className="text-zinc-400 text-lg font-medium tracking-wide">Case Dashboard</span>
          </div>
          <div className="stats-badge text-zinc-400">
            {excludeMode && excludedCount > 0 ? (
              <span>
                <span className="text-amber-400">{adjustedTotal.toLocaleString()}</span>
                <span className="text-zinc-600"> / {totalEpisodes.toLocaleString()}</span>
                <span> CASES</span>
              </span>
            ) : (
              <span>{totalEpisodes.toLocaleString()} CASES</span>
            )}
          </div>
        </div>

        {/* Search Row with Results Count */}
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          <SearchBar onSearch={handleSearch} />

          {hasResults && (
            <div className="result-count flex items-center gap-2 text-sm text-zinc-300 whitespace-nowrap">
              <div
                className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                style={{ backgroundColor: '#8b5cf6' }}
              />
              <span className="text-white font-semibold">{resultCount}</span>
              <span className="text-zinc-500">{resultCount === 1 ? 'match' : 'matches'}</span>
              <span className="text-zinc-600">·</span>
              <span className={excludeMode && excludedCount > 0 ? "text-amber-400 font-medium" : "text-violet-400 font-medium"}>
                {percentage}%
              </span>
              {excludeMode && excludedCount > 0 && (
                <span className="text-zinc-600 text-xs">(excl. formats)</span>
              )}
            </div>
          )}

          {searchQuery && resultCount === 0 && (
            <span className="text-sm text-zinc-500">No results</span>
          )}
        </div>

        {/* Twirl-downs row */}
        <div className="max-w-7xl mx-auto w-full space-y-2">
          {/* Seasons Twirl-down */}
          <div>
            <button
              onClick={() => setTopicsExpanded(!topicsExpanded)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${topicsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-mono text-xs uppercase tracking-wider">Seasons</span>
              {activeCategory && <span className="text-zinc-600 text-xs">(1 selected)</span>}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                topicsExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <CategoryPills
                activeCategory={activeCategory}
                onCategorySelect={handleCategorySelect}
              />
            </div>
          </div>

          {/* Case Types Twirl-down */}
          <div>
            <button
              onClick={() => setFormatsExpanded(!formatsExpanded)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${formatsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-mono text-xs uppercase tracking-wider">Case Types</span>
              {activeFormat && <span className="text-zinc-600 text-xs">(1 selected)</span>}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                formatsExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <FormatPills
                activeFormat={activeFormat}
                onFormatSelect={handleFormatSelect}
                excludedFormats={excludedFormats}
                onExcludedFormatsChange={setExcludedFormats}
                excludeMode={excludeMode}
                onExcludeModeChange={setExcludeMode}
              />
            </div>
          </div>

          {/* Stats Twirl-down */}
          <div>
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-mono text-xs uppercase tracking-wider">Stats</span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                statsExpanded ? 'max-h-[480px] opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              <StatsPanel isExpanded={statsExpanded} />
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <div className="flex-1 px-8 lg:px-16 xl:px-24 pb-6 min-h-0 flex flex-col justify-start">
        <div className="max-w-7xl mx-auto w-full corner-accent p-6 rounded-lg bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 relative z-10" style={{ height: 'fit-content' }}>
          <EpisodeGrid
            episodes={episodesWithHighlight}
            selectedEpisodeId={selectedEpisode?.id}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>

        {/* Episode Drawer */}
        <div className="max-w-7xl mx-auto w-full flex-shrink-0">
          <EpisodeDrawer
            episode={selectedEpisode}
            onClose={handleCloseDrawer}
          />
        </div>
      </div>
    </main>
  );
}
