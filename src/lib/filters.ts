export type FilterId = 'original' | 'noir' | 'vintage' | 'peach' | 'cool'

export type PhotoFilter = {
  id: FilterId
  label: string
  /** Dipakai untuk preview (CSS) dan capture (ctx.filter) — satu sumber kebenaran. */
  css: string
  /** Warna chip kecil di UI. */
  swatch: string
}

export const FILTERS: PhotoFilter[] = [
  { id: 'original', label: 'Normal', css: 'none', swatch: 'linear-gradient(135deg,#e7e9ef,#f7f8fb)' },
  {
    id: 'noir',
    label: 'Noir',
    css: 'grayscale(1) contrast(1.15) brightness(1.02)',
    swatch: 'linear-gradient(135deg,#2b2f38,#9aa0ae)',
  },
  {
    id: 'vintage',
    label: 'Vintage',
    css: 'sepia(0.32) saturate(1.12) contrast(1.06) brightness(1.03)',
    swatch: 'linear-gradient(135deg,#c9a06a,#f3e3c8)',
  },
  {
    id: 'peach',
    label: 'Soft Peach',
    css: 'sepia(0.16) saturate(1.24) hue-rotate(-8deg) brightness(1.06)',
    swatch: 'linear-gradient(135deg,#ffb9a3,#ffe3d6)',
  },
  {
    id: 'cool',
    label: 'Cool Tone',
    css: 'saturate(0.92) hue-rotate(9deg) brightness(1.03) contrast(1.06)',
    swatch: 'linear-gradient(135deg,#9db8d8,#e2edf9)',
  },
]

export function filterCss(id: FilterId): string {
  return FILTERS.find((f) => f.id === id)?.css ?? 'none'
}
