import { useEffect, useRef, useState } from 'react'
import { ensureNewsAssets } from '@/lib/canvas/newspaper'
import { loadImages, renderStrip, waitForFonts } from '@/lib/canvas/render'
import type { FrameId } from '@/lib/canvas/frames'
import type { GridMode } from '@/lib/canvas/layout'
import { cn } from '@/lib/utils'

type StripCanvasProps = {
  mode: GridMode
  frameId: FrameId
  base?: string
  caption?: string
  showDate?: boolean
  photos: string[]
  scale?: number
  className?: string
  label: string
}

export function StripCanvas({
  mode,
  frameId,
  base,
  caption,
  showDate = true,
  photos,
  scale = 1,
  className,
  label,
}: StripCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const photoKey = photos.join('|')

  useEffect(() => {
    let cancelled = false

    async function draw() {
      try {
        await Promise.all([waitForFonts(), ensureNewsAssets(frameId)])
        const images = await loadImages(photoKey ? photoKey.split('|') : [])
        if (cancelled || !ref.current) return
        renderStrip(ref.current, { mode, frameId, base, caption, showDate, photos: images, scale })
        setReady(true)
      } catch {
        if (!cancelled) setReady(false)
      }
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [mode, frameId, base, caption, showDate, photoKey, scale])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        'block h-auto w-full rounded-[10px] transition-opacity duration-300',
        ready ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}
