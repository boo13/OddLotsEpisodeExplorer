'use client';

import { CATEGORIES } from '@/lib/categories';

interface CategoryPillsProps {
  activeCategory: string | null;
  onCategorySelect: (categoryName: string | null) => void;
}

export function CategoryPills({ activeCategory, onCategorySelect }: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category.name;

        return (
          <button
            key={category.name}
            onClick={() => {
              if (isActive) {
                onCategorySelect(null);
              } else {
                onCategorySelect(category.name);
              }
            }}
            className={`category-pill ${isActive ? 'active' : ''}`}
            style={{
              backgroundColor: isActive ? category.color : 'transparent',
              borderColor: isActive ? category.color : `${category.color}50`,
              color: isActive ? '#fff' : category.color,
              boxShadow: isActive ? `0 0 20px ${category.color}40, 0 0 40px ${category.color}20` : 'none',
            }}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
