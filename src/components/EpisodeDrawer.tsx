'use client';

import type { Episode } from '@/types/episode';

interface EpisodeDrawerProps {
  episode: Episode | null;
  onClose: () => void;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  let text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  // Remove common boilerplate
  const boilerplatePatterns = [
    /Subscribe to the Odd Lots Newsletter.*/i,
    /See omnystudio\.com\/listener.*/i,
    /Join the conversation:?\s*discord\.gg\/oddlots.*/i,
    /Only Bloomberg\.com subscribers can get.*/i,
    /Only Bloomberg - Business News.*/i,
    /Read more:\s*$/i,
  ];
  for (const pattern of boilerplatePatterns) {
    text = text.replace(pattern, '').trim();
  }
  return text;
}

function getGuestSearchUrl(guest: string, company: string | null): string {
  // Google "I'm Feeling Lucky" - reliably lands on LinkedIn, Wikipedia, or company bio
  const query = company && company !== 'N/A'
    ? `${guest} ${company}`
    : guest;
  return `https://www.google.com/search?btnI&q=${encodeURIComponent(query)}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Date */}
              {episode.pub_date && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Date</span>
                  <span className="text-zinc-300 font-mono text-xs">{formatDate(episode.pub_date)}</span>
                </div>
              )}

              {/* Duration */}
              {episode.duration_seconds && episode.duration_seconds > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Runtime</span>
                  <span className="text-zinc-300 font-mono text-xs">{formatDuration(episode.duration_seconds)}</span>
                </div>
              )}

              {/* Guest */}
              {episode.guest && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Guest</span>
                  <span className="text-zinc-300 text-xs">
                    <a
                      href={getGuestSearchUrl(episode.guest, episode.guest_company)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-200 hover:text-violet-300 transition-colors underline decoration-zinc-600 underline-offset-2 hover:decoration-violet-400"
                    >
                      {episode.guest}
                    </a>
                    {episode.guest_title && episode.guest_title !== 'N/A' && (
                      <span className="text-zinc-500">, {episode.guest_title}</span>
                    )}
                    {episode.guest_company && episode.guest_company !== 'N/A' && (
                      <span className="text-zinc-500"> at {episode.guest_company}</span>
                    )}
                  </span>
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
          </div>
        </div>
      )}
    </div>
  );
}
