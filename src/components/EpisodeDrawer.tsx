'use client';

import { getFormatColor } from '@/lib/categories';
import type { Episode } from '@/types/episode';

interface EpisodeDrawerProps {
  episode: Episode | null;
  onClose: () => void;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function EpisodeDrawer({ episode, onClose }: EpisodeDrawerProps) {
  const isOpen = episode !== null;
  const description = episode ? stripHtml(episode.description) : '';
  const formatColor = episode ? getFormatColor(episode.format) : '#8b5cf6';

  return (
    <div
      className={`episode-drawer ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      {episode && (
        <div className="relative p-5 drawer-content">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors z-10"
            aria-label="Collapse drawer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <div className="max-w-4xl mx-auto space-y-3">
            {/* Title */}
            {episode.episode_link ? (
              <a
                href={episode.episode_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-white pr-8 leading-tight hover:text-violet-300 transition-colors inline-flex items-center gap-2 group"
              >
                {episode.title}
                <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <h2 className="text-lg font-semibold text-white pr-8 leading-tight">
                {episode.title}
              </h2>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Format badge */}
              <span
                className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: `${formatColor}20`, color: formatColor, border: `1px solid ${formatColor}40` }}
              >
                {episode.format}
              </span>

              {episode.season && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Season</span>
                  <span className="text-zinc-300 font-mono text-xs">{episode.season}</span>
                </div>
              )}

              {episode.case_name && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Case</span>
                  <span className="text-zinc-300 font-mono text-xs">{episode.case_name}</span>
                </div>
              )}

              {episode.guest && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Guest</span>
                  <span className="text-zinc-300 font-mono text-xs">{episode.guest}</span>
                </div>
              )}

              {episode.pub_date && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Published</span>
                  <span className="text-zinc-300 font-mono text-xs">{episode.pub_date}</span>
                </div>
              )}

              {episode.duration_seconds && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Duration</span>
                  <span className="text-zinc-300 font-mono text-xs">{formatDuration(episode.duration_seconds)}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-violet-500/20 via-zinc-700/50 to-transparent" />

            {description && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Description</span>
                <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
