'use client';

import { useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getFormatColor } from '@/lib/categories';
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

export function EpisodeRect({ episode, cellSize, isSelected, isSeasonHighlighted, onSelect, onHover }: EpisodeRectProps) {
  const description = truncate(stripHtml(episode.description), 180);
  const isHighlighted = episode.highlighted && episode.color;
  const formatColor = getFormatColor(episode.format);

  const handleClick = () => onSelect?.(episode);
  const handleMouseEnter = useCallback(() => onHover?.(episode.season), [episode, onHover]);
  const handleMouseLeave = useCallback(() => onHover?.(null), [onHover]);

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
          <h3 className="font-semibold text-sm leading-tight text-white">
            {episode.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Format badge */}
            <span
              className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${formatColor}20`, color: formatColor, border: `1px solid ${formatColor}40` }}
            >
              {episode.format}
            </span>

            {/* Season */}
            {episode.season && (
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                {episode.season}
              </span>
            )}

            {/* Date */}
            {episode.pub_date && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {episode.pub_date}
              </span>
            )}
          </div>

          {/* Case / guest */}
          {episode.case_name && (
            <div className="text-xs text-zinc-400">{episode.case_name}</div>
          )}
          {episode.guest && !episode.case_name && (
            <div className="text-xs text-zinc-400">Guest: {episode.guest}</div>
          )}

          {/* Description */}
          {description && (
            <p className="text-xs text-zinc-500 leading-relaxed pt-1 border-t border-zinc-800">
              {description}
            </p>
          )}

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
