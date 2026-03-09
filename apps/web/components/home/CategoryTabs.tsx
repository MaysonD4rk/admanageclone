'use client'

const CATEGORIES = ['All', 'Sale', 'New Year', 'Beauty', 'Health', 'Food']

interface CategoryTabsProps {
  active: string
  onChange: (cat: string) => void
}

export default function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            active === cat
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
