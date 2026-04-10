'use client';

import type { Episode } from '@/types/episode';

interface EpisodeDrawerProps {
  episode: Episode | null;
  onClose: () => void;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

function getSourceUrl(url: string | null): string {
  return url ?? 'https://www.undisclosedpod.com/seasons-cases';
}

export function EpisodeDrawer({ episode, onClose }: EpisodeDrawerProps) {
  const isOpen = episode !== null;
  const description = episode ? stripHtml(episode.description) : '';

  return (
    <div
      className={`episode-drawer ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      {episode && (
        <div className="relative p-5 drawer-content">
          {/* Collapse button (up arrow) */}
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
              href={getSourceUrl(episode.episode_link)}
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

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {episode.season && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Season</span>
                <span className="text-zinc-300 font-mono text-xs">{episode.season}</span>
              </div>
            )}

            {episode.format && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Format</span>
                <span className="text-zinc-300 font-mono text-xs">{episode.format}</span>
              </div>
            )}

            {episode.collection && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Collection</span>
                <span className="text-zinc-300 font-mono text-xs">{episode.collection}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-violet-500/20 via-zinc-700/50 to-transparent" />

          {/* Full description */}
          {description && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Description</span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {episode.episode_link && (
            <div className="pt-1">
              <a
                href={episode.episode_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-300 underline decoration-violet-500/40 underline-offset-2 hover:text-violet-200"
              >
                Open official Undisclosed source
              </a>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
