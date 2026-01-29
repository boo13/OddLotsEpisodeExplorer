'use client';

import { useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EpisodeWithHighlight } from '@/types/episode';

interface EpisodeRectProps {
  episode: EpisodeWithHighlight;
  cellSize: number;
  isSelected?: boolean;
  isYearHighlighted?: boolean;
  onSelect?: (episode: EpisodeWithHighlight) => void;
  onHover?: (year: string | null) => void;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getYear(pubDate: string | null): string | null {
  if (!pubDate) return null;
  return pubDate.slice(0, 4);
}

export function EpisodeRect({ episode, cellSize, isSelected, isYearHighlighted, onSelect, onHover }: EpisodeRectProps) {
  const description = truncate(stripHtml(episode.description), 180);
  const isHighlighted = episode.highlighted && episode.color;

  const handleClick = () => {
    onSelect?.(episode);
  };

  const handleMouseEnter = useCallback(() => {
    onHover?.(getYear(episode.pub_date));
  }, [episode.pub_date, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Determine background color
  let bgColor = '#27272a';
  if (isHighlighted) {
    bgColor = episode.color!;
  } else if (isYearHighlighted) {
    bgColor = '#3f3f46';
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`episode-cell ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''} ${isYearHighlighted && !isHighlighted ? 'year-glow' : ''}`}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: bgColor,
            color: isHighlighted ? episode.color : undefined,
            boxShadow: isHighlighted ? `0 0 ${cellSize}px ${episode.color}40` : undefined,
          }}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="tooltip-content max-w-sm bg-zinc-900/95 text-white p-4 rounded-lg z-[200]"
      >
        <div className="space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm leading-tight text-white">
            {episode.title}
          </h3>

          {/* Guest Info */}
          {episode.guest && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Guest</span>
              <span className="text-xs text-zinc-300">
                {episode.guest}
                {episode.guest_title && episode.guest_title !== 'N/A' && (
                  <span className="text-zinc-500">, {episode.guest_title}</span>
                )}
                {episode.guest_company && episode.guest_company !== 'N/A' && (
                  <span className="text-zinc-500"> at {episode.guest_company}</span>
                )}
              </span>
            </div>
          )}

          {/* Date */}
          {episode.pub_date && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Date</span>
              <span className="text-xs text-zinc-400 font-mono">{formatDate(episode.pub_date)}</span>
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-xs text-zinc-400 leading-relaxed pt-1 border-t border-zinc-800">
              {description}
            </p>
          )}

          {/* Color indicator for highlighted */}
          {isHighlighted && (
            <div
              className="h-0.5 rounded-full mt-2"
              style={{ backgroundColor: episode.color }}
            />
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
