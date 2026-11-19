import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StripCanvas } from '@/components/strip/StripCanvas'
import { Reveal } from '@/components/site/Reveal'
import { Marquee } from '@/components/ui/marquee'
import { FRAMES, type FrameTheme } from '@/lib/canvas/frames'
import { DEMO_PHOTOS } from '@/lib/demo'

const STRIP_FRAMES = FRAMES.filter((frame) => !frame.editorial)
const CITY_FRAMES = FRAMES.filter((frame) => frame.editorial)

export function FrameMarquee() {
  return (
    <section aria-labelledby="marquee-title" className="border-y bg-surface-soft py-10">
      <div className="container-page">
        <div className="flex flex-col gap-1 text-center">
          <h2 id="marquee-title" className="text-[22px] font-bold sm:text-[26px]">
            Enam frame klasik, satu klik.
          </h2>
          <p className="text-[13.5px] text-muted-foreground">
            Plus enam edisi koran kota dengan lambang dan foto arsip asli. Semua disusun di canvas dan
            tetap tajam saat diekspor 1200 px.
          </p>
        </div>
      </div>

      <div className="relative mt-7 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
        <Marquee pauseOnHover repeat={2} className="[--duration:46s] [--gap:0.9rem] py-1">
          {STRIP_FRAMES.map((frame, index) => (
            <figure key={frame.id} className="w-[132px] shrink-0">
              <div className="rounded-xl border bg-card p-1.5 shadow-xs">
                <StripCanvas
                  mode={1}
                  frameId={frame.id}
                  photos={[DEMO_PHOTOS[index % DEMO_PHOTOS.length]]}
                  scale={0.26}
                  caption="s/v"
                  label={`Frame ${frame.name}`}
                />
              </div>
              <figcaption className="mt-2 text-center text-[11.5px] font-medium text-muted-foreground">
                {frame.name}
              </figcaption>
            </figure>
          ))}
        </Marquee>
      </div>
    </section>
  )
}

function FrameCard({ frame, index }: { frame: FrameTheme; index: number }) {
  return (
    <Link
      to={`/studio?frame=${frame.id}`}
      className="group flex h-full flex-col rounded-[14px] border bg-card p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card focus-visible:-translate-y-0.5"
    >
      <div className="rounded-lg bg-secondary/60 p-2">
        <StripCanvas
          mode={1}
          frameId={frame.id}
          photos={[DEMO_PHOTOS[index % DEMO_PHOTOS.length]]}
          scale={0.34}
          caption={frame.editorial ? '' : frame.id === 'classic' ? 'life4cuts' : 'snapvibe'}
          label={`Pratinjau frame ${frame.name}`}
        />
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] leading-snug font-semibold">{frame.name}</h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{frame.tagline}</p>
        <div className="mt-3 flex gap-1.5">
          {frame.swatches.slice(0, 4).map((color) => (
            <span
              key={color}
              className="size-3.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </Link>
  )
}

export function FramesSection() {
  return (
    <section id="frame" className="scroll-mt-24 py-16 sm:py-20">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[52ch]">
              <p className="text-[12px] font-semibold tracking-[0.16em] text-primary uppercase">
                Katalog frame
              </p>
              <h2 className="mt-2 text-[clamp(1.7rem,4vw,2.4rem)] leading-tight font-extrabold">
                Dibuat untuk strip, bukan sekadar bingkai.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Setiap frame punya palet warna sendiri, area teks, dan dekorasi yang tetap tajam saat
                diekspor 1200 px. Enam di antaranya adalah edisi koran kota, lengkap dengan lambang
                kota, foto arsip berlisensi, dan artikel yang ditulis ulang dari sejarah tempatnya.
              </p>
            </div>
            <InlineStudioLink />
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {STRIP_FRAMES.map((frame, index) => (
            <Reveal key={frame.id} delay={index * 0.04}>
              <FrameCard frame={frame} index={index} />
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex items-baseline justify-between border-t pt-8">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-primary uppercase">
              Edisi koran kota
            </p>
            <h3 className="mt-2 text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold">
              Enam kota, enam halaman depan.
            </h3>
          </div>
          <p className="hidden text-[12.5px] text-muted-foreground sm:block">Bandung → Makassar</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {CITY_FRAMES.map((frame, index) => (
            <Reveal key={frame.id} delay={index * 0.04}>
              <FrameCard frame={frame} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function InlineStudioLink() {
  return (
    <Link
      to="/studio"
      className="group inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:underline"
    >
      Coba langsung
      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
    </Link>
  )
}
