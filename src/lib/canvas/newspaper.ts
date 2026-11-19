import type { EditorialSpec, FramePaint, FrameTheme } from './frames'
import type { GridMode } from './layout'
import { CITY_EDITIONS, type CityEdition } from './cities'
import { drawCover, drawGrain, drawSpacedText, withAlpha } from './draw'

const DISPLAY = '"Playfair Display Variable", "Times New Roman", Georgia, serif'
const BODY = '"Lora Variable", Georgia, "Times New Roman", serif'
const SANS = '"Inter Variable", system-ui, sans-serif'

const INK = '#1A150D'
const W = 600
const MX = 30
const CW = W - MX * 2

export const PAPER_TINTS = ['#F7EFDC', '#F0E6CE', '#FBF5E5', '#E9DDBF', '#DFD2B2']

type Box = { x: number; y: number; w: number; h: number }

type Column = { x: number; y: number; w: number; lines: string[]; lineH: number; size: number }

type NewsLayout = {
  width: number
  height: number
  headerTop: number
  headerBottom: number
  city: { text: string; size: number; baseline: number; kickerBaseline: number }
  dateline: Box
  hero: Box
  captionY: number
  headline: { x: number; y: number; w: number; size: number; lineH: number; lines: string[] }
  crest: { x: number; y: number; h: number; maxW: number }
  tag: { box: Box; lines: string[]; lineH: number }
  deck: { x: number; y: number; size: number; lineH: number; lines: string[] }
  bylineY: number
  body: Column[]
  archive: {
    photo: Box
    photoCaption: string
    credit: string
    captionY: number
    creditY: number
    textX: number
    textW: number
    labelY: number
    titleY: number
    titleLines: string[]
    ruleY: number
    noteY: number
    noteLines: string[]
    factRuleY: number
    factY: number
    factLines: string[]
  }
  insets: { box: Box; num: string; x: number; y: number; lines: string[] }[]
  footerY: number
}

/* ---------------------------------------------------------------- utilities */

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxW || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  const chars = [...text]
  return (
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + spacing * Math.max(0, chars.length - 1)
  )
}

function wrapTracked(ctx: CanvasRenderingContext2D, text: string, maxW: number, spacing: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (measureTracked(ctx, next, spacing) <= maxW || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function fitCitySize(ctx: CanvasRenderingContext2D, city: string) {
  // Nama kota mengisi lebar halaman, seperti masthead edisi cetak.
  let size = 156
  while (size > 44) {
    ctx.font = `italic 700 ${size}px ${DISPLAY}`
    if (ctx.measureText(city).width <= CW - 8) break
    size -= 2
  }
  return size
}

function flowColumns(
  ctx: CanvasRenderingContext2D,
  text: string,
  colW: number,
  count: number,
  size: number,
  lineH: number,
): Column[] {
  ctx.font = `400 ${size}px ${BODY}`
  const lines = wrapText(ctx, text, colW)
  const per = Math.max(1, Math.ceil(lines.length / count))
  const gap = 18
  return Array.from({ length: count }, (_, index) => ({
    x: MX + index * (colW + gap),
    y: 0,
    w: colW,
    lines: lines.slice(index * per, (index + 1) * per),
    lineH,
    size,
  }))
}

/* ------------------------------------------------------------------ assets */

const assetImages = new Map<string, HTMLImageElement>()
const assetRequests = new Map<string, Promise<void>>()

function requestAsset(src: string): Promise<void> {
  if (assetImages.has(src)) return Promise.resolve()
  const pending = assetRequests.get(src)
  if (pending) return pending
  const request = new Promise<void>((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      assetImages.set(src, image)
      resolve()
    }
    image.onerror = () => resolve()
    image.src = src
  })
  assetRequests.set(src, request)
  return request
}

/** Muat foto arsip + lambang kota sebelum halaman koran digambar. */
export function ensureNewsAssets(frameId: string): Promise<void> {
  const edition = CITY_EDITIONS.find((item) => item.frameId === frameId)
  if (!edition) return Promise.resolve()
  return Promise.all([requestAsset(edition.crest), requestAsset(edition.archive.photo)]).then(
    () => undefined,
  )
}

function newsImage(src: string) {
  return assetImages.get(src) ?? null
}

/* ------------------------------------------------------------------ layout */

function buildLayout(ctx: CanvasRenderingContext2D, mode: GridMode, edition: CityEdition): NewsLayout {
  const headerTop = 26
  const headerBottom = headerTop + 52

  const citySize = fitCitySize(ctx, edition.city)
  const cityBaseline = headerBottom + 12 + citySize * 0.8
  const kickerBaseline = cityBaseline + 16

  const dateline: Box = { x: MX, y: kickerBaseline + 8, w: CW, h: 26 }
  const heroH = mode === 1 ? 340 : 300
  const hero: Box = { x: MX, y: dateline.y + dateline.h + 12, w: CW, h: heroH }
  const captionY = hero.y + hero.h + 13

  const headlineSize = 25
  const headlineLineH = 29
  ctx.font = `700 ${headlineSize}px ${DISPLAY}`
  const headlineLines = wrapText(ctx, edition.headline, 330)
  const headlineTop = captionY + 30
  const headlineH = headlineLines.length * headlineLineH

  const tagW = 112
  ctx.font = `600 6.6px ${SANS}`
  const tagLines = wrapTracked(ctx, edition.tag, tagW - 16, 0.9)
  const tag = { x: W - MX - tagW, y: headlineTop + 2, w: tagW, h: 56 }

  let y = headlineTop + Math.max(headlineH, 58) + 12

  const deckSize = 10.2
  const deckLineH = 15
  ctx.font = `italic 400 ${deckSize}px ${BODY}`
  const deckLines = wrapText(ctx, edition.deck, CW - 4)
  const deck = { x: MX, y, size: deckSize, lineH: deckLineH, lines: deckLines }
  y += deckLines.length * deckLineH + 10
  const bylineY = y
  y += 14

  const bodySize = 9.3
  const bodyLineH = 13.8
  const colW = (CW - 18) / 2
  const body = flowColumns(ctx, edition.paragraphs.join(' '), colW, 2, bodySize, bodyLineH)
  const bodyH = Math.max(...body.map((col) => col.lines.length)) * bodyLineH
  body.forEach((col) => {
    col.y = y
  })
  y += bodyH + 16

  // Arsip: foto asli di kiri, catatan + fakta di kanan.
  const photo: Box = { x: MX, y, w: 198, h: 140 }
  const textX = MX + 212
  const textW = 328
  ctx.font = `700 13px ${DISPLAY}`
  const titleLines = wrapText(ctx, edition.archive.title, textW)
  const titleY = y + 31
  const titleBottom = titleY + (titleLines.length - 1) * 15
  const ruleY = titleBottom + 8
  const noteY = titleBottom + 21
  ctx.font = `400 8.1px ${BODY}`
  const noteLines = wrapText(ctx, edition.archive.note, textW).slice(0, 3)
  const noteBottom = noteY + Math.max(0, noteLines.length - 1) * 10.4
  const factRuleY = noteBottom + 10
  const factY = factRuleY + 13
  ctx.font = `italic 400 7.6px ${BODY}`
  const factLines = wrapText(ctx, edition.facts[0], textW - 12).slice(0, 2)

  const archive = {
    photo,
    photoCaption: edition.archive.photoCaption,
    credit: edition.archive.credit,
    captionY: photo.y + photo.h + 15,
    creditY: photo.y + photo.h + 26,
    textX,
    textW,
    labelY: y + 12,
    titleY,
    titleLines,
    ruleY,
    noteY,
    noteLines,
    factRuleY,
    factY,
    factLines,
  }
  y = photo.y + 172 + 14

  const insets: NewsLayout['insets'] = []
  if (mode >= 3) {
    const count = Math.min(mode - 1, 3)
    const gap = 12
    const iw = (CW - gap * (count - 1)) / count
    const ih = count === 1 ? 168 : count === 2 ? 136 : 116
    for (let index = 0; index < count; index++) {
      const box = { x: MX + index * (iw + gap), y, w: iw, h: ih }
      ctx.font = `400 7.2px ${BODY}`
      const lines = wrapText(ctx, edition.facts[index % edition.facts.length], iw - 18)
      insets.push({
        box,
        num: String(index + 1).padStart(2, '0'),
        x: box.x,
        y: box.y + ih + 6 + 8,
        lines: lines.slice(0, 3),
      })
    }
    y += ih + 44
  }

  const footerY = y + 4
  const height = Math.round(footerY + 30)

  return {
    width: W,
    height,
    headerTop,
    headerBottom,
    city: { text: edition.city, size: citySize, baseline: cityBaseline, kickerBaseline },
    dateline,
    hero,
    captionY,
    headline: { x: MX + 62, y: headlineTop, w: 330, size: headlineSize, lineH: headlineLineH, lines: headlineLines },
    crest: { x: MX, y: headlineTop - 2, h: 46, maxW: 50 },
    tag: { box: tag, lines: tagLines, lineH: 10 },
    deck,
    bylineY,
    body,
    archive,
    insets,
    footerY,
  }
}

/* ---------------------------------------------------------- drawing helpers */

function drawRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, weight = 1, alpha = 0.9) {
  ctx.fillStyle = withAlpha(INK, alpha)
  ctx.fillRect(x, y, w, weight)
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = fill
  ctx.fillRect(-size / 2, -size / 2, size, size)
  ctx.restore()
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* --------------------------------------------------------------- paper look */

function drawAgedPaper(ctx: CanvasRenderingContext2D, height: number, base: string, seed: number) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, height)

  const wash = ctx.createLinearGradient(0, 0, W * 0.7, height)
  wash.addColorStop(0, 'rgba(255,255,255,0.22)')
  wash.addColorStop(0.45, 'rgba(255,255,255,0)')
  wash.addColorStop(1, 'rgba(120,90,42,0.07)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, height)

  const vignette = ctx.createRadialGradient(W / 2, height * 0.42, height * 0.18, W / 2, height * 0.5, height * 0.78)
  vignette.addColorStop(0, 'rgba(96,70,30,0)')
  vignette.addColorStop(1, 'rgba(96,70,30,0.13)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, height)

  drawGrain(ctx, 0, 0, W, height, 0.12)

  // Noda kertas (foxing) deterministik supaya pratinjau = hasil ekspor.
  const random = mulberry32(seed)
  for (let i = 0; i < 60; i++) {
    const x = random() * W
    const y = random() * height
    const radius = 0.5 + random() * 2.8
    ctx.fillStyle = withAlpha('#7A5C2C', 0.02 + random() * 0.055)
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Tepi pelat cetak.
  ctx.strokeStyle = withAlpha(INK, 0.2)
  ctx.lineWidth = 0.8
  ctx.strokeRect(10.5, 10.5, W - 21, height - 21)
}

let halftone: CanvasPattern | null = null

function halftonePattern(ctx: CanvasRenderingContext2D) {
  if (!halftone) {
    const tile = document.createElement('canvas')
    tile.width = 4
    tile.height = 4
    const g = tile.getContext('2d')
    if (!g) return null
    g.fillStyle = 'rgba(36,28,14,0.6)'
    g.beginPath()
    g.arc(1.2, 1.2, 0.65, 0, Math.PI * 2)
    g.fill()
    halftone = ctx.createPattern(tile, 'repeat')
  }
  return halftone
}

function drawNewsPhoto(ctx: CanvasRenderingContext2D, photo: CanvasImageSource | null, box: Box) {
  if (photo) {
    ctx.save()
    if (typeof ctx.filter === 'string') ctx.filter = 'grayscale(1) sepia(0.4) contrast(1.08) brightness(0.97)'
    drawCover(ctx, photo, box, 0)
    ctx.restore()

    const pattern = halftonePattern(ctx)
    if (pattern) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.w, box.h)
      ctx.clip()
      ctx.globalAlpha = 0.12
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = pattern
      ctx.fillRect(box.x, box.y, box.w, box.h)
      ctx.restore()
    }
  } else {
    ctx.fillStyle = withAlpha(INK, 0.07)
    ctx.fillRect(box.x, box.y, box.w, box.h)
  }
  ctx.save()
  ctx.strokeStyle = withAlpha(INK, 0.55)
  ctx.lineWidth = 1
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1)
  ctx.restore()
}

/** Lambang kota asli, dicetak mono seperti emblem di koran lama. */
function drawCityCrest(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  box: NewsLayout['crest'],
) {
  if (!image) return
  const source = image as HTMLImageElement
  const ratio = source.width / source.height
  let h = box.h
  let w = h * ratio
  if (w > box.maxW) {
    w = box.maxW
    h = w / ratio
  }
  const x = box.x + (box.maxW - w) / 2
  ctx.save()
  if (typeof ctx.filter === 'string') ctx.filter = 'grayscale(0.72) sepia(0.18) contrast(1.14)'
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 1
  ctx.drawImage(source, x, box.y, w, h)
  ctx.restore()
}

/* -------------------------------------------------------------------- paint */

function drawJustified(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  baseline: number,
  width: number,
) {
  const words = line.split(' ')
  if (words.length < 2) {
    ctx.fillText(line, x, baseline)
    return
  }
  const wordsWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0)
  const gap = (width - wordsWidth) / (words.length - 1)
  let cursor = x
  for (const word of words) {
    ctx.fillText(word, cursor, baseline)
    cursor += ctx.measureText(word).width + gap
  }
}

function drawTrackedLeft(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + spacing
  }
}

function formatEditorialDate(date: Date) {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      .format(date)
      .toUpperCase()
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
  }
}

function paintPage(
  ctx: CanvasRenderingContext2D,
  layout: NewsLayout,
  edition: CityEdition,
  paint: FramePaint,
  photos: (CanvasImageSource | null)[],
) {
  const seed = 17 + CITY_EDITIONS.findIndex((item) => item.frameId === edition.frameId) * 31
  drawAgedPaper(ctx, layout.height, paint.base, seed)

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  /* --- kepala halaman --- */
  drawRule(ctx, MX, layout.headerTop - 10, CW, 2, 0.95)
  drawRule(ctx, MX, layout.headerTop - 6, CW, 0.8, 0.55)
  drawRule(ctx, MX, layout.headerBottom, CW, 1.4, 0.95)
  drawRule(ctx, MX + 150, layout.headerTop - 4, 0.9, 40, 0.45)
  drawRule(ctx, W - MX - 150, layout.headerTop - 4, 0.9, 40, 0.45)

  ctx.save()
  ctx.strokeStyle = withAlpha(INK, 0.45)
  ctx.lineWidth = 1
  ctx.strokeRect(MX + 6.5, layout.headerTop + 3.5, 137, 39)
  ctx.strokeRect(W - MX - 143.5, layout.headerTop + 3.5, 137, 39)
  ctx.restore()

  ctx.fillStyle = withAlpha(INK, 0.85)
  ctx.textBaseline = 'middle'
  ctx.font = `700 6.6px ${SANS}`
  drawSpacedText(ctx, 'BERITA', MX + 75, layout.headerTop + 17, 1.7)
  drawSpacedText(ctx, 'KOTA', MX + 75, layout.headerTop + 31, 1.7)
  drawSpacedText(ctx, 'EDISI', W - MX - 75, layout.headerTop + 17, 1.7)
  drawSpacedText(ctx, 'KHUSUS', W - MX - 75, layout.headerTop + 31, 1.7)

  const mastheadY = layout.headerTop + 22
  ctx.fillStyle = INK
  ctx.font = `700 27px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText('SnapVibe', W / 2, mastheadY)
  ctx.font = `600 5.4px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.7)
  drawSpacedText(ctx, 'SURAT KABAR STUDIO', W / 2, layout.headerTop + 40, 2.6)
  diamond(ctx, W / 2 - 92, mastheadY - 1, 4.4, withAlpha(INK, 0.75))
  diamond(ctx, W / 2 + 92, mastheadY - 1, 4.4, withAlpha(INK, 0.75))

  /* --- nama kota --- */
  ctx.fillStyle = INK
  ctx.font = `italic 700 ${layout.city.size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(layout.city.text, W / 2, layout.city.baseline)

  ctx.font = `600 7px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.72)
  drawSpacedText(ctx, edition.kicker, W / 2, layout.city.kickerBaseline, 3.4)

  /* --- bar tanggal --- */
  const d = layout.dateline
  ctx.fillStyle = withAlpha(INK, 0.035)
  ctx.fillRect(d.x, d.y, d.w, d.h)
  drawRule(ctx, d.x, d.y, d.w, 1.2, 0.9)
  drawRule(ctx, d.x, d.y + d.h - 1.2, d.w, 1.2, 0.9)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `700 7.2px ${SANS}`
  ctx.fillStyle = INK
  drawSpacedText(ctx, edition.issue, d.x + 4, d.y + d.h / 2, 1.1)

  ctx.font = `600 6.6px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.8)
  const centerLabel = 'TENTANG KOTA'
  const centerWidth = measureTracked(ctx, centerLabel, 2.8)
  drawSpacedText(ctx, centerLabel, W / 2 - centerWidth / 2, d.y + d.h / 2, 2.8)
  for (const dir of [-1, 1]) {
    const cx = W / 2 + dir * (centerWidth / 2 + 12)
    ctx.beginPath()
    ctx.moveTo(cx - 3, d.y + d.h / 2 - 2)
    ctx.lineTo(cx + 3, d.y + d.h / 2 - 2)
    ctx.lineTo(cx, d.y + d.h / 2 + 2.4)
    ctx.closePath()
    ctx.fill()
  }

  ctx.textAlign = 'right'
  ctx.font = `600 6.8px ${SANS}`
  const dateLabel = paint.showDate ? formatEditorialDate(paint.date) : edition.coords
  drawSpacedText(ctx, dateLabel, d.x + d.w - 4 - measureTracked(ctx, dateLabel, 1.2), d.y + d.h / 2, 1.2)

  /* --- foto utama --- */
  drawNewsPhoto(ctx, photos[0] ?? null, layout.hero)

  const caption = !paint.caption || paint.caption === 'snapvibe' ? edition.heroCaption : paint.caption
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `italic 400 8px ${BODY}`
  ctx.fillStyle = withAlpha(INK, 0.82)
  ctx.fillText(`— ${caption}`, MX, layout.captionY)
  ctx.textAlign = 'right'
  ctx.font = `600 6.2px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.55)
  drawSpacedText(ctx, edition.coords, MX + CW - measureTracked(ctx, edition.coords, 1.1), layout.captionY, 1.1)

  /* --- label rubrik --- */
  const sectionLabel = 'LAPORAN UTAMA'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 6.2px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.72)
  drawTrackedLeft(ctx, sectionLabel, MX, layout.captionY + 15, 2.1)
  const labelW = measureTracked(ctx, sectionLabel, 2.1)
  drawRule(ctx, MX + labelW + 10, layout.captionY + 12, CW - labelW - 10, 0.7, 0.4)

  /* --- lambang + judul + label --- */
  drawCityCrest(ctx, newsImage(edition.crest), layout.crest)

  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `700 ${layout.headline.size}px ${DISPLAY}`
  layout.headline.lines.forEach((line, index) => {
    ctx.fillText(
      line,
      layout.headline.x,
      layout.headline.y + layout.headline.size * 0.86 + index * layout.headline.lineH,
    )
  })

  const tag = layout.tag.box
  ctx.strokeStyle = withAlpha(INK, 0.85)
  ctx.lineWidth = 1.2
  ctx.strokeRect(tag.x + 0.5, tag.y + 0.5, tag.w - 1, tag.h - 1)
  ctx.font = `600 6.6px ${SANS}`
  ctx.fillStyle = INK
  const tagTop = tag.y + tag.h / 2 - ((layout.tag.lines.length - 1) * layout.tag.lineH) / 2
  layout.tag.lines.forEach((line, index) => {
    const lineW = measureTracked(ctx, line, 0.9)
    drawSpacedText(ctx, line, tag.x + (tag.w - lineW) / 2, tagTop + index * layout.tag.lineH, 0.9)
  })

  /* --- dek --- */
  ctx.textAlign = 'left'
  ctx.font = `italic 400 ${layout.deck.size}px ${BODY}`
  ctx.fillStyle = withAlpha(INK, 0.78)
  layout.deck.lines.forEach((line, index) => {
    ctx.fillText(line, layout.deck.x, layout.deck.y + layout.deck.size + index * layout.deck.lineH)
  })

  /* --- byline --- */
  const byline = 'OLEH REDAKSI SNAPVIBE'
  ctx.font = `600 5.8px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.62)
  drawTrackedLeft(ctx, byline, MX, layout.bylineY, 1.6)
  const bylineW = measureTracked(ctx, byline, 1.6)
  drawRule(ctx, MX + bylineW + 10, layout.bylineY - 2, CW - bylineW - 10, 0.6, 0.3)

  /* --- artikel, dua kolom + garis kolom --- */
  const bodyH = Math.max(...layout.body.map((col) => col.lines.length)) * layout.body[0].lineH
  layout.body.forEach((col, index) => {
    if (index < layout.body.length - 1) {
      drawRule(ctx, col.x + col.w + 9, col.y - 3, 0.6, bodyH + 6, 0.18)
    }
  })

  const allLines = layout.body.reduce((sum, col) => sum + col.lines.length, 0)
  let lineIndex = 0
  layout.body.forEach((col) => {
    ctx.font = `400 ${col.size}px ${BODY}`
    ctx.fillStyle = withAlpha(INK, 0.92)
    col.lines.forEach((line, index) => {
      const baseline = col.y + col.size + index * col.lineH
      if (lineIndex === allLines - 1) ctx.fillText(line, col.x, baseline)
      else drawJustified(ctx, line, col.x, baseline, col.w)
      lineIndex += 1
    })
  })

  /* --- arsip foto + catatan --- */
  const a = layout.archive
  drawNewsPhoto(ctx, newsImage(edition.archive.photo), a.photo)

  drawRule(ctx, a.photo.x, a.photo.y + a.photo.h + 7, a.photo.w, 0.6, 0.5)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 6.4px ${SANS}`
  ctx.fillStyle = INK
  drawTrackedLeft(ctx, a.photoCaption.toUpperCase(), a.photo.x, a.captionY, 0.5)

  ctx.font = `italic 400 5.8px ${BODY}`
  ctx.fillStyle = withAlpha(INK, 0.6)
  ctx.fillText(`Foto: ${a.credit}`, a.photo.x, a.creditY)

  ctx.font = `700 5.8px ${SANS}`
  ctx.fillStyle = withAlpha(INK, 0.6)
  drawTrackedLeft(ctx, 'ARSIP FOTO', a.textX, a.labelY, 2.2)

  ctx.fillStyle = INK
  ctx.font = `700 13px ${DISPLAY}`
  a.titleLines.forEach((line, index) => {
    ctx.fillText(line, a.textX, a.titleY + index * 15)
  })
  drawRule(ctx, a.textX, a.ruleY, 52, 0.7, 0.45)

  ctx.font = `400 8.1px ${BODY}`
  ctx.fillStyle = withAlpha(INK, 0.82)
  a.noteLines.forEach((line, index) => {
    ctx.fillText(line, a.textX, a.noteY + index * 10.4)
  })

  drawRule(ctx, a.textX, a.factRuleY, a.textW, 0.6, 0.3)
  ctx.font = `italic 400 7.6px ${BODY}`
  ctx.fillStyle = withAlpha(INK, 0.72)
  ctx.fillText('—', a.textX, a.factY)
  a.factLines.forEach((line, index) => {
    ctx.fillText(line, a.textX + 9, a.factY + index * 9.6)
  })

  /* --- foto pendukung --- */
  layout.insets.forEach((inset, index) => {
    drawNewsPhoto(ctx, photos[index + 1] ?? null, inset.box)

    ctx.textAlign = 'left'
    ctx.fillStyle = INK
    ctx.font = `italic 700 12px ${DISPLAY}`
    ctx.fillText(inset.num, inset.x, inset.y)
    ctx.font = `400 7.2px ${BODY}`
    ctx.fillStyle = withAlpha(INK, 0.8)
    inset.lines.forEach((line, lineIdx) => {
      ctx.fillText(line, inset.x + 19, inset.y + lineIdx * 9.6)
    })
  })

  /* --- kaki halaman --- */
  drawRule(ctx, MX, layout.footerY, CW, 1.6, 0.9)
  drawRule(ctx, MX, layout.footerY + 3.4, CW, 0.7, 0.55)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = withAlpha(INK, 0.72)
  ctx.font = `600 6.2px ${SANS}`
  drawTrackedLeft(ctx, `SNAP VIBE · ${edition.city} · ${edition.founded}`, MX, layout.footerY + 18, 1.7)
  const pageLabel = 'HALAMAN 01 / 01'
  ctx.textAlign = 'right'
  drawSpacedText(
    ctx,
    pageLabel,
    W - MX - measureTracked(ctx, pageLabel, 1.4),
    layout.footerY + 18,
    1.4,
  )
  diamond(ctx, W / 2, layout.footerY + 14.5, 3.2, withAlpha(INK, 0.6))
}

/* ------------------------------------------------------------------- frames */

function makeFrame(edition: CityEdition): FrameTheme {
  const editorial: EditorialSpec = {
    measure: (mode) => {
      const ctx = scratchCtx()
      if (!ctx) return { width: W, height: 1180 }
      const layout = buildLayout(ctx, mode, edition)
      return { width: layout.width, height: layout.height }
    },
    paint: (ctx, mode, paint, photos) => {
      const layout = buildLayout(ctx, mode, edition)
      paintPage(ctx, layout, edition, paint, photos)
    },
  }

  return {
    id: edition.frameId,
    name: `Koran ${edition.name}`,
    shortName: edition.name,
    tagline: edition.tagline,
    chip: 'linear-gradient(135deg,#F7F0DC,#D9CDB0)',
    swatches: PAPER_TINTS,
    defaultBase: PAPER_TINTS[0],
    slotRadius: 0,
    ink: () => INK,
    paintBase: () => {},
    paintOverlay: () => {},
    editorial,
  }
}

let scratch: CanvasRenderingContext2D | null = null
function scratchCtx() {
  if (!scratch) {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = 8
    scratch = canvas.getContext('2d')
  }
  return scratch
}

export const NEWSPAPER_FRAMES: FrameTheme[] = CITY_EDITIONS.map(makeFrame)
export const NEWSPAPER_IDS = CITY_EDITIONS.map((edition) => edition.frameId)
