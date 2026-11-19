export type RGB = { r: number; g: number; b: number }

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const num = Number.parseInt(full.slice(0, 6), 16)
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex({ r, g, b }: RGB) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

/** Campur dua warna. t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number) {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  })
}

/** amt > 0 → lebih terang, amt < 0 → lebih gelap. */
export function shade(hex: string, amt: number) {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt)
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function inkFor(base: string) {
  return relativeLuminance(base) > 0.42 ? '#141726' : '#ffffff'
}

export function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacing: number,
) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, chars.length - 1)
  let x = centerX - total / 2
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y)
    x += widths[i] + spacing
  }
}

let grainCache: HTMLCanvasElement | null = null

export function grainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (!grainCache) {
    const size = 96
    grainCache = document.createElement('canvas')
    grainCache.width = size
    grainCache.height = size
    const gctx = grainCache.getContext('2d')
    if (!gctx) return null
    const data = gctx.createImageData(size, size)
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 80 + Math.random() * 120
      data.data[i] = v
      data.data[i + 1] = v
      data.data[i + 2] = v
      data.data[i + 3] = Math.random() * 55
    }
    gctx.putImageData(data, 0, 0)
  }
  return ctx.createPattern(grainCache, 'repeat')
}

export function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number,
) {
  const pattern = grainPattern(ctx)
  if (!pattern) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = pattern
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

/** Gambar dengan mode cover (tidak gepeng) di dalam rect. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: { x: number; y: number; w: number; h: number },
  radius: number,
) {
  const source = image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
  const iw = source.naturalWidth ?? source.width ?? rect.w
  const ih = source.naturalHeight ?? source.height ?? rect.h
  if (!iw || !ih) return

  ctx.save()
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius)
  ctx.clip()

  const imageRatio = iw / ih
  const boxRatio = rect.w / rect.h
  let dw: number
  let dh: number
  if (imageRatio > boxRatio) {
    dh = rect.h
    dw = dh * imageRatio
  } else {
    dw = rect.w
    dh = dw / imageRatio
  }
  ctx.drawImage(image, rect.x - (dw - rect.w) / 2, rect.y - (dh - rect.h) / 2, dw, dh)
  ctx.restore()
}

export function sparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  rotation = 0,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.quadraticCurveTo(size * 0.16, -size * 0.16, size, 0)
  ctx.quadraticCurveTo(size * 0.16, size * 0.16, 0, size)
  ctx.quadraticCurveTo(-size * 0.16, size * 0.16, -size, 0)
  ctx.quadraticCurveTo(-size * 0.16, -size * 0.16, 0, -size)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}
