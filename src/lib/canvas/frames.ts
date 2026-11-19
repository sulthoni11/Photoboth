import type { Layout } from './layout'
import type { GridMode } from './layout'
import { NEWSPAPER_FRAMES } from './newspaper'
import type { NewspaperId } from './cities'
import {
  drawGrain,
  drawSpacedText,
  fillRoundRect,
  mix,
  roundRectPath,
  sparkle,
  withAlpha,
} from './draw'

export type FrameId =
  | 'kawaii'
  | 'chrome'
  | 'coquette'
  | 'classic'
  | 'groovy'
  | 'polaroid'
  | NewspaperId

export type FramePaint = {
  base: string
  caption: string
  showDate: boolean
  dateLabel: string
  date: Date
  ink: string
}

/** Frame yang menyusun halamannya sendiri (misal edisi koran kota). */
export type EditorialSpec = {
  measure: (mode: GridMode, paint: FramePaint) => { width: number; height: number }
  paint: (
    ctx: CanvasRenderingContext2D,
    mode: GridMode,
    paint: FramePaint,
    photos: (CanvasImageSource | null)[],
  ) => void
}

export type FrameTheme = {
  id: FrameId
  name: string
  /** Label pendek di kartu pemilih frame. */
  shortName?: string
  tagline: string
  /** Gradient CSS untuk chip di UI. */
  chip: string
  swatches: string[]
  defaultBase: string
  slotRadius: number
  /** Warna teks; default dihitung dari luminance base. */
  ink?: (base: string) => string
  paintBase: (ctx: CanvasRenderingContext2D, l: Layout, p: FramePaint) => void
  paintOverlay: (ctx: CanvasRenderingContext2D, l: Layout, p: FramePaint) => void
  /** Bila ada, renderStrip memakai komposisi khusus, bukan slot vertikal biasa. */
  editorial?: EditorialSpec
}

const DISPLAY = '"Plus Jakarta Sans Variable", "Inter Variable", system-ui, sans-serif'
const SANS = '"Inter Variable", system-ui, sans-serif'

type FooterOpts = {
  family?: 'display' | 'sans'
  weight?: number
  size?: number
  spacing?: number
  ink: string
  dateSize?: number
  dateSpacing?: number
  italic?: boolean
  baseline?: number
}

function footerText(ctx: CanvasRenderingContext2D, l: Layout, p: FramePaint, o: FooterOpts) {
  const family = o.family === 'sans' ? SANS : DISPLAY
  const y = l.footerTop + (l.mode === 1 ? 64 : 46) + (o.baseline ?? 0)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  if (p.caption) {
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 700} ${o.size ?? 17}px ${family}`
    ctx.fillStyle = o.ink
    drawSpacedText(ctx, p.caption, l.width / 2, y, o.spacing ?? 0.8)
  }
  if (p.showDate) {
    ctx.font = `500 ${o.dateSize ?? 11}px ${family}`
    ctx.fillStyle = withAlpha(o.ink, 0.68)
    drawSpacedText(ctx, p.dateLabel, l.width / 2, y + (p.caption ? 22 : 0), o.dateSpacing ?? 2.4)
  }
}

function slotFrame(
  ctx: CanvasRenderingContext2D,
  l: Layout,
  opts: { radius: number; stroke: string; width: number; inset?: number },
) {
  for (const slot of l.slots) {
    ctx.save()
    const i = opts.inset ?? 0
    roundRectPath(ctx, slot.x - i, slot.y - i, slot.w + i * 2, slot.h + i * 2, opts.radius + i)
    ctx.strokeStyle = opts.stroke
    ctx.lineWidth = opts.width
    ctx.stroke()
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ kawaii */

function catEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  w: number,
  h: number,
  fill: string,
  inner: string,
) {
  ctx.beginPath()
  ctx.moveTo(x, base)
  ctx.quadraticCurveTo(x + w * 0.06, base - h * 0.92, x + w * 0.46, base - h)
  ctx.quadraticCurveTo(x + w * 0.96, base - h * 0.86, x + w, base)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(x + w * 0.18, base - 4)
  ctx.quadraticCurveTo(x + w * 0.24, base - h * 0.62, x + w * 0.46, base - h * 0.74)
  ctx.quadraticCurveTo(x + w * 0.7, base - h * 0.62, x + w * 0.81, base - 4)
  ctx.closePath()
  ctx.fillStyle = inner
  ctx.fill()
}

function paw(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(0, s * 0.35, s * 0.62, s * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  const toes: Array<[number, number]> = [
    [-s * 0.62, -s * 0.28],
    [-s * 0.2, -s * 0.52],
    [s * 0.24, -s * 0.52],
    [s * 0.64, -s * 0.24],
  ]
  for (const [tx, ty] of toes) {
    ctx.beginPath()
    ctx.ellipse(tx, ty, s * 0.19, s * 0.24, -0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function bow(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string, dark: string) {
  ctx.save()
  ctx.translate(cx, cy)
  // tails
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo(-s * 0.12, s * 0.1)
  ctx.quadraticCurveTo(-s * 0.9, s * 0.9, -s * 0.34, s * 1.15)
  ctx.quadraticCurveTo(-s * 0.1, s * 0.8, s * 0.02, s * 0.18)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(s * 0.12, s * 0.1)
  ctx.quadraticCurveTo(s * 0.9, s * 0.9, s * 0.34, s * 1.15)
  ctx.quadraticCurveTo(s * 0.1, s * 0.8, -s * 0.02, s * 0.18)
  ctx.closePath()
  ctx.fill()
  // loops
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.ellipse(-s * 0.52, -s * 0.12, s * 0.52, s * 0.36, -0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(s * 0.52, -s * 0.12, s * 0.52, s * 0.36, 0.34, 0, Math.PI * 2)
  ctx.fill()
  // knot
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.2, s * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const kawaii: FrameTheme = {
  id: 'kawaii',
  name: 'Pastel Kawaii Cat',
  tagline: 'Telinga kucing, pita satin, dan warna cream',
  chip: 'linear-gradient(135deg,#FFE9EF,#FFF7F1)',
  defaultBase: '#FFF1EC',
  swatches: ['#FFF1EC', '#FFE3EC', '#FFF6DA', '#EAF3FF', '#F3ECFF'],
  slotRadius: 8,
  paintBase: (ctx, l, p) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, l.width, l.height)

    const glow = ctx.createLinearGradient(0, l.height * 0.35, 0, l.height)
    glow.addColorStop(0, withAlpha('#F7A7C0', 0))
    glow.addColorStop(1, withAlpha('#F7A7C0', 0.22))
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, l.width, l.height)

    const earFill = mix(p.base, '#F4A6BE', 0.38)
    const earInner = mix(p.base, '#F79FBB', 0.62)
    catEar(ctx, l.pad + 52, l.top - 4, 94, 56, earFill, earInner)
    catEar(ctx, l.width - l.pad - 146, l.top - 4, 94, 56, earFill, earInner)

    const pawColor = withAlpha(mix(p.base, '#E9839F', 0.55), 0.5)
    paw(ctx, 52, l.footerTop + 62, 13, pawColor)
    paw(ctx, 74, l.footerTop + 96, 10, pawColor)
    paw(ctx, l.width - 56, l.footerTop + 58, 11, pawColor)
  },
  paintOverlay: (ctx, l, p) => {
    slotFrame(ctx, l, { radius: kawaii.slotRadius, stroke: withAlpha('#ffffff', 0.92), width: 7 })
    slotFrame(ctx, l, { radius: kawaii.slotRadius, stroke: withAlpha('#E88CA6', 0.35), width: 1.5, inset: 1 })

    ctx.save()
    ctx.setLineDash([7, 6])
    roundRectPath(ctx, 13, 13, l.width - 26, l.height - 26, 16)
    ctx.strokeStyle = withAlpha('#E58CA6', 0.55)
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.restore()

    bow(ctx, l.width / 2, l.footerTop + 14, 20, mix(p.base, '#F5A2BC', 0.75), mix(p.base, '#E4779A', 0.8))
    footerText(ctx, l, p, { ink: p.ink, spacing: 1.1, size: 17 })
  },
}

/* ------------------------------------------------------------------ chrome */

function pixelHeart(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string) {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']
  ctx.fillStyle = color
  rows.forEach((row, ry) => {
    ;[...row].forEach((bit, rx) => {
      if (bit === '1') ctx.fillRect(x + rx * cell, y + ry * cell, cell, cell)
    })
  })
}

const chrome: FrameTheme = {
  id: 'chrome',
  name: 'Retro Y2K Chrome',
  tagline: 'Metalik perak, hati pixel, dan sparkle',
  chip: 'linear-gradient(135deg,#E9ECF3,#B9C1D2)',
  defaultBase: '#DDE2EC',
  swatches: ['#DDE2EC', '#CBD9F2', '#E5C9D9', '#C9E7E2', '#B9BEC9'],
  slotRadius: 2,
  paintBase: (ctx, l, p) => {
    const g = ctx.createLinearGradient(0, 0, l.width * 0.4, l.height)
    g.addColorStop(0, mix(p.base, '#ffffff', 0.72))
    g.addColorStop(0.32, mix(p.base, '#ffffff', 0.12))
    g.addColorStop(0.5, mix(p.base, '#ffffff', 0.62))
    g.addColorStop(0.72, mix(p.base, '#000000', 0.14))
    g.addColorStop(1, mix(p.base, '#ffffff', 0.3))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, l.width, l.height)

    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ffffff'
    ctx.translate(l.width * 0.5, l.height * 0.1)
    ctx.rotate(-0.36)
    for (const w of [
      [0, 26],
      [44, 8],
      [-70, 14],
    ]) {
      ctx.fillRect(w[0], -l.height, w[1], l.height * 2.4)
    }
    ctx.restore()

    pixelHeart(ctx, 44, 26, 3, '#F2457F')
    pixelHeart(ctx, l.width - 86, l.footerTop + 30, 3, '#24BFA8')
    sparkle(ctx, l.width - 58, 34, 11, '#ffffff', 0.2)
    sparkle(ctx, 68, l.footerTop + 66, 7, '#ffffff', -0.1)
    sparkle(ctx, l.width - 42, l.footerTop + 74, 5, '#3AD2BA', 0.4)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 10px ${DISPLAY}`
    ctx.fillStyle = withAlpha('#1C2130', 0.5)
    drawSpacedText(ctx, 'SNAPVIBE', l.width / 2, 40, 5)
  },
  paintOverlay: (ctx, l, p) => {
    slotFrame(ctx, l, { radius: 2, stroke: '#232838', width: 2.5 })
    slotFrame(ctx, l, { radius: 2, stroke: withAlpha('#ffffff', 0.65), width: 1, inset: 3 })

    ctx.strokeStyle = withAlpha('#232838', 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(48, l.footerTop + 22)
    ctx.lineTo(l.width - 48, l.footerTop + 22)
    ctx.stroke()

    footerText(ctx, l, p, { ink: p.ink, weight: 800, size: 18, spacing: 2.2, dateSpacing: 3.2 })
  },
}

/* ---------------------------------------------------------------- coquette */

const coquette: FrameTheme = {
  id: 'coquette',
  name: 'Coquette Ribbon & Lace',
  tagline: 'Renda ivory, pita satin, dan ceri',
  chip: 'linear-gradient(135deg,#FFFBF7,#F6E3E7)',
  defaultBase: '#FFFBF7',
  swatches: ['#FFFBF7', '#FDF1F3', '#F7EFE6', '#F3F6FA', '#FFF7E4'],
  slotRadius: 6,
  paintBase: (ctx, l, p) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, l.width, l.height)

    const lace = mix(p.base, '#EBB6C6', 0.55)
    for (const y of [0, l.height - 14]) {
      ctx.fillStyle = lace
      ctx.fillRect(0, y, l.width, 14)
      for (let x = 0; x < l.width; x += 18) {
        ctx.beginPath()
        ctx.fillStyle = lace
        // Atas: setengah lingkaran ke bawah. Bawah: setengah lingkaran ke atas.
        if (y === 0) ctx.arc(x + 9, 14, 8, 0, Math.PI)
        else ctx.arc(x + 9, l.height - 14, 8, Math.PI, Math.PI * 2)
        ctx.fill()
      }
    }
    // titik renda
    ctx.fillStyle = withAlpha('#ffffff', 0.85)
    for (let x = 4; x < l.width; x += 18) {
      ctx.beginPath()
      ctx.arc(x + 5, 7, 1.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 5, l.height - 7, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // ceri di kaki kiri
    const cherry = '#D6405B'
    ctx.strokeStyle = '#4F6B3A'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(40, l.footerTop + 78)
    ctx.quadraticCurveTo(46, l.footerTop + 54, 58, l.footerTop + 46)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(58, l.footerTop + 78)
    ctx.quadraticCurveTo(58, l.footerTop + 56, 58, l.footerTop + 46)
    ctx.stroke()
    ctx.fillStyle = cherry
    ctx.beginPath()
    ctx.arc(40, l.footerTop + 80, 7.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(58, l.footerTop + 80, 7.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = withAlpha('#ffffff', 0.55)
    ctx.beginPath()
    ctx.arc(37, l.footerTop + 77, 2.2, 0, Math.PI * 2)
    ctx.fill()
  },
  paintOverlay: (ctx, l, p) => {
    slotFrame(ctx, l, { radius: 6, stroke: withAlpha('#ffffff', 0.95), width: 6 })
    slotFrame(ctx, l, { radius: 6, stroke: withAlpha('#DE9AAE', 0.5), width: 1.2, inset: 1 })

    bow(ctx, l.width / 2, l.footerTop + 4, 17, '#F0A9C0', '#D97C9B')
    footerText(ctx, l, p, {
      ink: p.ink,
      italic: true,
      weight: 600,
      size: 18,
      spacing: 0.4,
      baseline: 8,
    })
  },
}

/* ----------------------------------------------------------------- classic */

const classic: FrameTheme = {
  id: 'classic',
  name: 'Classic Korean Life4Cuts',
  tagline: 'Hitam pekat, tipografi tipis, timestamp',
  chip: 'linear-gradient(135deg,#1A1B1F,#3A3C44)',
  defaultBase: '#131316',
  swatches: ['#131316', '#FFFFFF', '#F1ECE3', '#E7E9F2'],
  slotRadius: 2,
  ink: (base) => (base.toUpperCase() === '#FFFFFF' || base.toUpperCase() === '#F1ECE3' ? '#141726' : '#ffffff'),
  paintBase: (ctx, l, p) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, l.width, l.height)
    drawGrain(ctx, 0, 0, l.width, l.height, 0.18)

    ctx.strokeStyle = withAlpha(p.ink, 0.18)
    ctx.lineWidth = 1
    ctx.strokeRect(16.5, 16.5, l.width - 33, l.height - 33)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 9px ${SANS}`
    ctx.fillStyle = withAlpha(p.ink, 0.6)
    drawSpacedText(ctx, 'SNAPVIBE STUDIO', l.width / 2, 42, 3.4)
  },
  paintOverlay: (ctx, l, p) => {
    slotFrame(ctx, l, { radius: 2, stroke: withAlpha(p.ink, 0.22), width: 1 })
    footerText(ctx, l, p, {
      ink: p.ink,
      weight: 700,
      size: 16,
      spacing: 1.6,
      dateSpacing: 3.4,
      dateSize: 10,
    })
  },
}

/* ------------------------------------------------------------------ groovy */

function daisy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  petal: string,
  center: string,
  face: boolean,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = petal
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.rotate(Math.PI / 4)
    ctx.ellipse(0, -r * 0.72, r * 0.34, r * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = center
  ctx.fill()
  if (face) {
    ctx.fillStyle = withAlpha('#4A3110', 0.85)
    ctx.beginPath()
    ctx.arc(-r * 0.14, -r * 0.03, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(r * 0.14, -r * 0.03, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, r * 0.08, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.strokeStyle = withAlpha('#4A3110', 0.85)
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
  }
  ctx.restore()
}

const groovy: FrameTheme = {
  id: 'groovy',
  name: 'Groovy 70s Daisy',
  tagline: 'Papan catur kuning dan bunga tersenyum',
  chip: 'linear-gradient(135deg,#FFE9A8,#F7C96B)',
  defaultBase: '#FFE9A8',
  swatches: ['#FFE9A8', '#FFD9C2', '#D9F0C4', '#CFE6F7', '#F3D9EF'],
  slotRadius: 16,
  paintBase: (ctx, l, p) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, l.width, l.height)

    const dark = mix(p.base, '#F2A03D', 0.62)
    const light = mix(p.base, '#ffffff', 0.55)
    const cell = 22
    for (const bandTop of [0, l.height - cell * 2]) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col * cell < l.width; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? dark : light
          ctx.fillRect(col * cell, bandTop + row * cell, cell, cell)
        }
      }
    }
    daisy(ctx, l.width / 2, 40, 30, '#FFFDF6', '#F5A63B', true)
    daisy(ctx, 46, l.footerTop + 78, 15, '#FFFDF6', '#F5A63B', false)
    daisy(ctx, l.width - 44, l.footerTop + 72, 12, '#FFFDF6', '#F5A63B', false)
  },
  paintOverlay: (ctx, l, p) => {
    slotFrame(ctx, l, { radius: 16, stroke: withAlpha('#ffffff', 0.9), width: 5 })
    footerText(ctx, l, p, { ink: p.ink, weight: 800, size: 19, spacing: 0.6, dateSize: 10 })
  },
}

/* ---------------------------------------------------------------- polaroid */

const polaroid: FrameTheme = {
  id: 'polaroid',
  name: 'Polaroid Film Strip',
  tagline: 'Tekstur kertas film dan nomor frame',
  chip: 'linear-gradient(135deg,#F7F2E4,#E4DCC9)',
  defaultBase: '#F6F2E7',
  swatches: ['#F6F2E7', '#EFEAD9', '#EDE7EE', '#E8EEEA', '#2A2723'],
  slotRadius: 2,
  ink: (base) => (base === '#2A2723' ? '#F6F2E7' : '#26231E'),
  paintBase: (ctx, l, p) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, l.width, l.height)
    drawGrain(ctx, 0, 0, l.width, l.height, 0.28)

    const hole = mix(p.base, '#8C815F', 0.22)
    for (let y = 22; y < l.height - 18; y += 30) {
      for (const x of [7, l.width - 19]) {
        fillRoundRect(ctx, x, y, 12, 8, 2.5, hole)
      }
    }

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = `600 8.5px ${SANS}`
    ctx.fillStyle = withAlpha(p.ink, 0.55)
    drawSpacedText(ctx, `FILM 400 · ${l.mode} EXP`, l.width / 2, 40, 2.2)
  },
  paintOverlay: (ctx, l, p) => {
    l.slots.forEach((slot, index) => {
      ctx.save()
      ctx.strokeStyle = withAlpha('#ffffff', 0.92)
      ctx.lineWidth = 8
      roundRectPath(ctx, slot.x, slot.y, slot.w, slot.h, 2)
      ctx.stroke()
      ctx.restore()

      const label = `0${index + 1}A`
      ctx.font = `600 9px ${SANS}`
      const w = ctx.measureText(label).width + 12
      fillRoundRect(ctx, slot.x + 10, slot.y + 10, w, 17, 4, withAlpha('#1B1915', 0.62))
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      drawSpacedText(ctx, label, slot.x + 10 + w / 2, slot.y + 19, 1)
    })

    footerText(ctx, l, p, {
      ink: p.ink,
      family: 'sans',
      weight: 600,
      size: 15,
      spacing: 1.4,
      dateSize: 10,
      dateSpacing: 1.8,
    })
  },
}

export const FRAMES: FrameTheme[] = [kawaii, chrome, coquette, classic, groovy, polaroid, ...NEWSPAPER_FRAMES]

export function getFrame(id: FrameId): FrameTheme {
  return FRAMES.find((f) => f.id === id) ?? classic
}
