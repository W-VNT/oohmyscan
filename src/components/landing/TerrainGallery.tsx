interface TerrainGalleryProps {
  photos: string[]
}

export function TerrainGallery({ photos }: TerrainGalleryProps) {
  if (photos.length === 0) return null

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
        Photos terrain
      </span>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {photos.map((src, i) => (
          <div
            key={i}
            className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#E5E5E5] dark:border-white/[0.06] bg-[#F5F5F5] dark:bg-white/[0.03]"
          >
            <img
              src={src}
              alt={`Photo terrain ${i + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
