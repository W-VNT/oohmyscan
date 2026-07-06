/**
 * Fetch an image URL and convert to base64 data URL.
 * Needed for @react-pdf/renderer which can't load cross-origin images directly.
 */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Downscale une image (data URL ou URL) via canvas et retourne un data URL
 * plus petit. Essentiel avant l'embedding dans un PDF @react-pdf/renderer
 * pour reduire la RAM allouee (une image 2000x2000 decodee = 16MB, 400x400 = 640KB).
 *
 * @param input data URL ou URL absolue
 * @param maxW largeur max en px
 * @param maxH hauteur max en px
 * @param format 'jpeg' recommande pour photos, 'png' si transparence
 * @param quality 0-1 pour JPEG, ignore pour PNG
 */
export async function downscaleImage(
  input: string,
  maxW: number,
  maxH: number,
  format: 'jpeg' | 'png' = 'jpeg',
  quality = 0.7,
): Promise<string> {
  const img = await loadImage(input)
  const ratio = Math.min(1, maxW / img.width, maxH / img.height)
  const width = Math.round(img.width * ratio)
  const height = Math.round(img.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return input
  // Fond blanc pour JPEG (JPEG n'a pas de transparence, la couleur transparente
  // deviendrait noire par defaut, on force blanc).
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)
  const out = format === 'jpeg'
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png')
  // Aide GC : reduit le canvas a 1x1 apres extraction du data URL, l'ancien
  // ImageData est deallocable.
  canvas.width = 1
  canvas.height = 1
  return out
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Impossible de charger l'image : ${src.slice(0, 80)}`))
    img.src = src
  })
}
