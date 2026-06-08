import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Resout un storage path Supabase en signed URL et affiche l'image.
 * Cache par path pour eviter de re-signer N fois la meme photo (utile car
 * la meme image peut apparaitre en cover + region intro).
 */
const cache = new Map<string, { url: string; expiresAt: number }>()

async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const cacheKey = `${bucket}/${path}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error || !data) return null
  cache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + 3300_000 }) // 55min safety
  return data.signedUrl
}

interface Props {
  bucket?: string
  path: string | null | undefined
  alt?: string
  style?: CSSProperties
  /** Si vrai : filtre noir et blanc applique. */
  grayscale?: boolean
  /** Couleur de tint en overlay (rgba). */
  tintColor?: string
  /** Si vrai : zoom + couvre completement (object-fit cover). Defaut: true. */
  cover?: boolean
}

export function SignedImage({
  bucket = 'panel-photos',
  path,
  alt = '',
  style,
  grayscale,
  tintColor,
  cover = true,
}: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let cancelled = false
    getSignedUrl(bucket, path).then((u) => {
      if (!cancelled) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, path])

  if (!path) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F3F4F6',
          color: '#9CA3AF',
          fontSize: 14,
        }}
      >
        Aucune image
      </div>
    )
  }

  if (!url) {
    return (
      <div
        style={{
          ...style,
          backgroundColor: '#F3F4F6',
        }}
      />
    )
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <img
        src={url}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: cover ? 'cover' : 'contain',
          filter: grayscale ? 'grayscale(100%)' : undefined,
          display: 'block',
        }}
      />
      {tintColor && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: tintColor,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
