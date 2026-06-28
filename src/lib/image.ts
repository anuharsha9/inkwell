import type { ImageSource, InkImage } from '@/types'
import { nowISO, uuid } from './text'

// Max dimension we store (PRD §5.5 storage caution) — plenty for web publishing.
const MAX_DIM = 2000

// Downscale a raster image to MAX_DIM (longest edge) and return a data URL.
// Keeps base64 in IndexedDB from ballooning. Non-raster/animated types pass
// through untouched.
export async function fileToStoredDataUrl(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file)
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return dataUrl
  try {
    const img = await loadImage(dataUrl)
    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    if (longest <= MAX_DIM) return dataUrl
    const scale = MAX_DIM / longest
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    // JPEG for photos keeps size down; keep PNG if it had transparency.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    return canvas.toDataURL(type, 0.86)
  } catch {
    return dataUrl // if canvas fails, store the original rather than lose it
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}

// Build a fresh InkImage record. Alt defaults are filled by the caller
// (article title) so "ready" is never blocked on an empty required field.
export function makeImage(opts: {
  src: string
  source: ImageSource
  alt?: string
  attribution?: string
  prompt?: string | null
}): InkImage {
  return {
    id: uuid(),
    src: opts.src,
    source: opts.source,
    alt: opts.alt ?? '',
    attribution: opts.attribution ?? '',
    prompt: opts.prompt ?? null,
    createdAt: nowISO(),
  }
}
