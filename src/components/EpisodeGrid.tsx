'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EpisodeRect } from './EpisodeRect';
import type { EpisodeWithHighlight } from '@/types/episode';

interface EpisodeGridProps {
  episodes: EpisodeWithHighlight[];
  selectedEpisodeId?: number | null;
  onSelectEpisode?: (episode: EpisodeWithHighlight) => void;
}

function getYear(pubDate: string | null): string | null {
  if (!pubDate) return null;
  return pubDate.slice(0, 4);
}

export function EpisodeGrid({ episodes, selectedEpisodeId, onSelectEpisode }: EpisodeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridConfig, setGridConfig] = useState({ columns: 50, cellSize: 14, gap: 2 });
  const [hoveredYear, setHoveredYear] = useState<string | null>(null);

  const handleHoverEpisode = useCallback((year: string | null) => {
    setHoveredYear(year);
  }, []);

  useEffect(() => {
    const calculateGrid = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const totalEpisodes = episodes.length;

      if (width === 0 || height === 0) return;

      const gap = 2;
      let bestConfig = { columns: 50, cellSize: 14, gap };
      let bestFillScore = 0;

      // Try different column counts to find the one that best fills the space
      for (let cols = 35; cols <= 70; cols++) {
        const rows = Math.ceil(totalEpisodes / cols);

        // Calculate the maximum cell size that fits
        const availableWidth = width - (cols - 1) * gap;
        const availableHeight = height - (rows - 1) * gap;
        const maxCellWidth = availableWidth / cols;
        const maxCellHeight = availableHeight / rows;
        const cellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));

        if (cellSize >= 8 && cellSize <= 20) {
          const gridWidth = cols * cellSize + (cols - 1) * gap;
          const gridHeight = rows * cellSize + (rows - 1) * gap;

          // Calculate how well this fills the container
          const widthFill = gridWidth / width;
          const heightFill = gridHeight / height;
          const fillScore = widthFill * heightFill * cellSize;

          if (fillScore > bestFillScore && gridWidth <= width && gridHeight <= height) {
            bestFillScore = fillScore;
            bestConfig = { columns: cols, cellSize, gap };
          }
        }
      }

      setGridConfig(bestConfig);
    };

    // Initial calculation with a small delay to ensure container is measured
    const timer = setTimeout(calculateGrid, 50);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculateGrid);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [episodes.length]);

  // Add padding to prevent hover cutoff (cells scale 1.8x, so we need space)
  const hoverPadding = Math.ceil(gridConfig.cellSize * 0.5);

  return (
    <TooltipProvider delayDuration={50}>
      <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-visible">
        <div
          className="grid-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridConfig.columns}, ${gridConfig.cellSize}px)`,
            gridAutoRows: `${gridConfig.cellSize}px`,
            gap: `${gridConfig.gap}px`,
            padding: `${hoverPadding}px`,
            margin: `-${hoverPadding}px`,
          }}
        >
          {episodes.map((episode) => (
            <EpisodeRect
              key={episode.id}
              episode={episode}
              cellSize={gridConfig.cellSize}
              isSelected={selectedEpisodeId === episode.id}
              isYearHighlighted={hoveredYear !== null && getYear(episode.pub_date) === hoveredYear}
              onSelect={onSelectEpisode}
              onHover={handleHoverEpisode}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
