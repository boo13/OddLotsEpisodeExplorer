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
  isSeasonHighlighted?: boolean;
  onSelect?: (episode: EpisodeWithHighlight) => void;
  onHover?: (season: string | null) => void;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getSeason(episode: EpisodeWithHighlight): string | null {
  return episode.season ?? null;
}

export function EpisodeRect({ episode, cellSize, isSelected, isSeasonHighlighted, onSelect, onHover }: EpisodeRectProps) {
  const description = truncate(stripHtml(episode.description), 180);
  const isHighlighted = episode.highlighted && episode.color;

  const handleClick = () => {
    onSelect?.(episode);
  };

  const handleMouseEnter = useCallback(() => {
    onHover?.(getSeason(episode));
  }, [episode, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Determine background color
  let bgColor = '#27272a';
  if (isHighlighted) {
    bgColor = episode.color!;
  } else if (isSeasonHighlighted) {
    bgColor = '#3f3f46';
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`episode-cell ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''} ${isSeasonHighlighted && !isHighlighted ? 'year-glow' : ''}`}
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

          {/* Season */}
          {episode.season && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Season</span>
              <span className="text-xs text-zinc-300">
                {episode.season}
                {episode.format && (
                  <span className="text-zinc-500"> · {episode.format}</span>
                )}
              </span>
            </div>
          )}

          {/* Collection */}
          {episode.collection && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Collection</span>
              <span className="text-xs text-zinc-400 font-mono">{episode.collection}</span>
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
