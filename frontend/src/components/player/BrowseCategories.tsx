"use client";

import Image from 'next/image'

interface Category {
  id: string;
  name: string;
  imageUrl: string;
}

interface Props {
  categories: Category[];
  loading?: boolean;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
}

const CATEGORY_COLORS = [
  "bg-pink-600",
  "bg-green-700",
  "bg-purple-700",
  "bg-blue-700",
  "bg-yellow-600",
  "bg-red-700",
  "bg-indigo-700",
  "bg-orange-600",
  "bg-teal-700",
  "bg-rose-700",
  "bg-cyan-700",
  "bg-lime-700",
];

export function BrowseCategories({
  categories,
  loading,
  onCategorySelect,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-600">
        <span className="animate-pulse text-sm">Loading...</span>
      </div>
    );
  }
  if (categories.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        Browse all
      </p>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onCategorySelect(cat.id, cat.name)}
            className={`relative overflow-hidden rounded-lg h-16 text-left ${
              CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            } hover:brightness-110 active:scale-95 transition-all`}
          >
            <span className="absolute left-2 bottom-2 text-white font-bold text-xs leading-tight z-10 pr-10">
              {cat.name}
            </span>
            {cat.imageUrl && (
              <Image
                src={cat.imageUrl}
                alt={cat.name}
                width={56}
                height={56}
                className="absolute right-0 bottom-0 rotate-25 translate-x-2 translate-y-1 rounded-sm shadow-lg"
                unoptimized
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
