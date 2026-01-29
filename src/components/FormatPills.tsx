'use client';

import { useState, useEffect } from 'react';
import { FORMATS } from '@/lib/categories';

interface FormatCount {
  name: string;
  count: number;
  episodeIds: number[];
}

interface FormatPillsProps {
  activeFormat: string | null;
  onFormatSelect: (formatName: string | null) => void;
  excludedFormats: Set<string>;
  onExcludedFormatsChange: (formats: Set<string>) => void;
  excludeMode: boolean;
  onExcludeModeChange: (enabled: boolean) => void;
}

export function FormatPills({
  activeFormat,
  onFormatSelect,
  excludedFormats,
  onExcludedFormatsChange,
  excludeMode,
  onExcludeModeChange
}: FormatPillsProps) {
  const [formatCounts, setFormatCounts] = useState<Map<string, FormatCount>>(new Map());

  // Fetch format counts on mount
  useEffect(() => {
    fetch('/api/format-counts')
      .then(res => res.json())
      .then((data: FormatCount[]) => {
        const map = new Map<string, FormatCount>();
        data.forEach(fc => map.set(fc.name, fc));
        setFormatCounts(map);
      })
      .catch(err => console.error('Failed to load format counts:', err));
  }, []);

  const handleExcludeToggle = (formatName: string) => {
    const newExcluded = new Set(excludedFormats);
    if (newExcluded.has(formatName)) {
      newExcluded.delete(formatName);
    } else {
      newExcluded.add(formatName);
    }
    onExcludedFormatsChange(newExcluded);
  };

  const handleExcludeAll = () => {
    const allFormats = new Set(FORMATS.map(f => f.name));
    onExcludedFormatsChange(allFormats);
  };

  return (
    <div className="space-y-3">
      {/* Exclude mode toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (!excludeMode) {
              // When enabling exclude mode, default to all formats excluded
              handleExcludeAll();
            }
            onExcludeModeChange(!excludeMode);
          }}
          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded border transition-all ${
            excludeMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
          }`}
        >
          {excludeMode ? '✓ Exclude Mode' : 'Exclude Formats'}
        </button>

        {excludeMode && excludedFormats.size > 0 && (
          <span className="text-xs text-amber-400/70">
            ({excludedFormats.size} excluded)
          </span>
        )}
      </div>

      {/* Format pills */}
      <div className="flex flex-wrap items-center gap-2">
        {FORMATS.map((format) => {
          const isActive = activeFormat === format.name;
          const isExcluded = excludedFormats.has(format.name);
          const count = formatCounts.get(format.name)?.count ?? 0;

          if (excludeMode) {
            // Exclude mode: show checkboxes
            return (
              <button
                key={format.name}
                onClick={() => handleExcludeToggle(format.name)}
                className={`category-pill flex items-center gap-2 ${isExcluded ? 'excluded' : ''}`}
                style={{
                  backgroundColor: isExcluded ? `${format.color}15` : 'transparent',
                  borderColor: isExcluded ? format.color : `${format.color}50`,
                  color: isExcluded ? format.color : `${format.color}90`,
                  textDecoration: isExcluded ? 'line-through' : 'none',
                  opacity: isExcluded ? 0.7 : 1,
                }}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                  isExcluded ? 'border-current bg-current/20' : 'border-current/50'
                }`}>
                  {isExcluded && '✕'}
                </span>
                {format.name}
                <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          }

          // Normal mode: select format
          return (
            <button
              key={format.name}
              onClick={() => {
                if (isActive) {
                  onFormatSelect(null);
                } else {
                  onFormatSelect(format.name);
                }
              }}
              className={`category-pill ${isActive ? 'active' : ''}`}
              style={{
                backgroundColor: isActive ? format.color : 'transparent',
                borderColor: isActive ? format.color : `${format.color}50`,
                color: isActive ? '#fff' : format.color,
                boxShadow: isActive ? `0 0 20px ${format.color}40, 0 0 40px ${format.color}20` : 'none',
              }}
            >
              {format.name}
              <span className="text-xs opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
