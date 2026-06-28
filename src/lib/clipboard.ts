import type { Article, InkImage } from '@/types'

// Resolve inline image references for copy-out. In the body she uses
// ![alt](image-id); for publishing we swap remote-URL images to their real URL
// and leave a clear placeholder for local uploads (which she grabs separately).
function resolveBody(body: string, images: Record<string, InkImage>): string {
  return body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt: string, ref: string) => {
    const img = images[ref.trim()]
    if (!img) return whole
    if (img.source === 'url') return `![${alt || img.alt}](${img.src})`
    // local upload / AI image — keep a labeled placeholder; she drags the file in
    return `![${alt || img.alt}](attach: ${img.alt || 'image'})`
  })
}

// Full clean article: title as H1 + body. The workhorse output (PRD §5.3).
export function formatArticle(a: Article, images: Record<string, InkImage>): string {
  const title = a.title.trim() || 'Untitled'
  const body = resolveBody(a.body, images).trim()
  return body ? `# ${title}\n\n${body}\n` : `# ${title}\n`
}

// Body only — some platforms take the title field separately (PRD §5.3).
export function formatBodyOnly(a: Article, images: Record<string, InkImage>): string {
  return resolveBody(a.body, images).trim() + '\n'
}

// Clipboard write with a legacy fallback so copy never silently fails.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Copy a single image to the clipboard (PNG). Falls back to false if the
// environment can't write images — caller can offer download instead.
export async function copyImage(img: InkImage): Promise<boolean> {
  try {
    if (!navigator.clipboard || !('write' in navigator.clipboard)) return false
    const blob = await (await fetch(img.src)).blob()
    // Clipboard image write generally requires PNG.
    const png = blob.type === 'image/png' ? blob : await toPng(blob)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    return true
  } catch {
    return false
  }
}

async function toPng(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImg(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}

// Trigger a download of an image to disk.
export function downloadImage(img: InkImage, filename: string) {
  const a = document.createElement('a')
  a.href = img.src
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
