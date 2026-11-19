import { drawCover, fillRoundRect, inkFor, mix } from './draw'
import { getFrame, type FrameId } from './frames'
import { createLayout, type GridMode } from './layout'

export type StripRenderOptions = {
  mode: GridMode
  frameId: FrameId
  base?: string
  caption?: string
  showDate?: boolean
  date?: Date
  photos: (CanvasImageSource | null)[]
  scale?: number
}

export function formatDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

export function renderStrip(canvas: HTMLCanvasElement, opts: StripRenderOptions) {
  const theme = getFrame(opts.frameId)
  const base = opts.base ?? theme.defaultBase
  const ink = theme.ink ? theme.ink(base) : inkFor(base)
  const scale = opts.scale ?? 1
  const date = opts.date ?? new Date()

  const paint = {
    base,
    caption: (opts.caption ?? '').slice(0, 25),
    showDate: opts.showDate ?? true,
    dateLabel: formatDate(date),
    date,
    ink,
  }

  if (theme.editorial) {
    const size = theme.editorial.measure(opts.mode, paint)
    canvas.width = Math.round(size.width * scale)
    canvas.height = Math.round(size.height * scale)
    const newsCtx = canvas.getContext('2d')
    if (!newsCtx) return { width: canvas.width, height: canvas.height }
    newsCtx.setTransform(scale, 0, 0, scale, 0, 0)
    newsCtx.clearRect(0, 0, size.width, size.height)
    theme.editorial.paint(newsCtx, opts.mode, paint, opts.photos)
    return { width: canvas.width, height: canvas.height }
  }

  const layout = createLayout(opts.mode)

  canvas.width = Math.round(layout.width * scale)
  canvas.height = Math.round(layout.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return { width: canvas.width, height: canvas.height }

  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, layout.width, layout.height)

  theme.paintBase(ctx, layout, paint)

  layout.slots.forEach((slot, index) => {
    const photo = opts.photos[index]
    if (photo) {
      drawCover(ctx, photo, slot, theme.slotRadius)
      return
    }
    fillRoundRect(ctx, slot.x, slot.y, slot.w, slot.h, theme.slotRadius, mix(base, '#000000', 0.07))
    ctx.save()
    ctx.strokeStyle = mix(base, '#000000', 0.16)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(slot.x + slot.w / 2, slot.y + slot.h / 2 - 6, 14, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(slot.x + slot.w / 2 - 22, slot.y + slot.h / 2 + 4, 44, 22, 5)
    ctx.stroke()
    ctx.restore()
  })

  theme.paintOverlay(ctx, layout, paint)

  return { width: canvas.width, height: canvas.height }
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

/** Cache agar foto demo tidak di-decode ulang di setiap thumbnail. */
export function loadImageCached(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached
  const promise = loadImage(src)
  imageCache.set(src, promise)
  promise.catch(() => imageCache.delete(src))
  return promise
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`))
    image.src = src
  })
}

export async function loadImages(sources: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(sources.map(loadImageCached))
}

export async function waitForFonts() {
  if (!('fonts' in document)) return
  try {
    await Promise.all([
      document.fonts.load('700 18px "Plus Jakarta Sans Variable"'),
      document.fonts.load('500 12px "Inter Variable"'),
      document.fonts.load('italic 700 90px "Playfair Display Variable"'),
      document.fonts.load('700 24px "Playfair Display Variable"'),
      document.fonts.load('400 10px "Lora Variable"'),
      document.fonts.load('italic 400 10px "Lora Variable"'),
      document.fonts.ready,
    ])
  } catch {
    /* font gagal dimuat: canvas memakai fallback sistem */
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg'): Promise<Blob> {
  const type = format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = format === 'png' ? undefined : 0.92
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas gagal diekspor'))),
      type,
      quality,
    )
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function exportFilename(frameId: FrameId, format: 'png' | 'jpeg') {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `snapvibe-${frameId}-${stamp}.${format === 'png' ? 'png' : 'jpg'}`
}
