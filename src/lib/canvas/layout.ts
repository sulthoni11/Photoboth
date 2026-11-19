export type GridMode = 1 | 3 | 4

export type Rect = { x: number; y: number; w: number; h: number }

export type Layout = {
  mode: GridMode
  width: number
  height: number
  pad: number
  top: number
  gap: number
  photoW: number
  photoH: number
  footerH: number
  footerTop: number
  slots: Rect[]
}

/** Lebar desain. Semua angka frame memakai ruang koordinat ini, lalu diskalakan. */
export const DESIGN_WIDTH = 600
const PAD = 34
const TOP = 72
const GAP = 14

/** Rasio slot (lebar / tinggi) per mode. */
export const PHOTO_ASPECT: Record<GridMode, number> = { 1: 1, 3: 0.82, 4: 1 }

export function createLayout(mode: GridMode): Layout {
  const footerH = mode === 1 ? 148 : 108
  const photoW = DESIGN_WIDTH - PAD * 2
  const photoH = Math.round(photoW / PHOTO_ASPECT[mode])
  const slots: Rect[] = Array.from({ length: mode }, (_, i) => ({
    x: PAD,
    y: TOP + i * (photoH + GAP),
    w: photoW,
    h: photoH,
  }))
  const height = TOP + mode * photoH + (mode - 1) * GAP + footerH
  return {
    mode,
    width: DESIGN_WIDTH,
    height,
    pad: PAD,
    top: TOP,
    gap: GAP,
    photoW,
    photoH,
    footerH,
    footerTop: height - footerH,
    slots,
  }
}
