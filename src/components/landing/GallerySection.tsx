import { StripCanvas } from '@/components/strip/StripCanvas'
import { Reveal } from '@/components/site/Reveal'
import type { FrameId } from '@/lib/canvas/frames'
import { DEMO_PHOTOS } from '@/lib/demo'

const SAMPLES: Array<{ frameId: FrameId; mode: 3; caption: string; photos: string[] }> = [
  { frameId: 'kawaii', mode: 3, caption: 'sweet day', photos: DEMO_PHOTOS.slice(0, 3) },
  { frameId: 'groovy', mode: 3, caption: 'good vibes', photos: [DEMO_PHOTOS[3], DEMO_PHOTOS[1], DEMO_PHOTOS[2]] },
  { frameId: 'coquette', mode: 3, caption: 'mon amour', photos: [DEMO_PHOTOS[2], DEMO_PHOTOS[0], DEMO_PHOTOS[3]] },
]

export function GallerySection() {
  return (
    <section aria-labelledby="gallery-title" className="border-y bg-surface-soft py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="gallery-title" className="text-[clamp(1.7rem,4vw,2.3rem)] font-extrabold">
              Hasilnya seperti ini.
            </h2>
            <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Dirender oleh mesin canvas yang sama dengan studio — bukan mockup, bukan gambar tempelan.
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground">Contoh foto: Unsplash License</p>
        </div>

        <div className="no-scrollbar mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible">
          {SAMPLES.map((sample, index) => (
            <Reveal key={sample.frameId} delay={index * 0.05} className="shrink-0 snap-start sm:shrink">
              <figure className="w-[188px] sm:w-auto">
                <div className="rounded-xl border bg-card p-2 shadow-xs">
                  <StripCanvas
                    mode={sample.mode}
                    frameId={sample.frameId}
                    photos={sample.photos}
                    scale={0.46}
                    caption={sample.caption}
                    label={`Contoh hasil strip ${sample.frameId}`}
                  />
                </div>
                <figcaption className="mt-2.5 text-center text-[12px] text-muted-foreground">
                  {sample.frameId === 'kawaii' && 'Pastel Kawaii Cat · 3 pose'}
                  {sample.frameId === 'groovy' && 'Groovy 70s Daisy · 3 pose'}
                  {sample.frameId === 'coquette' && 'Coquette Ribbon & Lace · 3 pose'}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
