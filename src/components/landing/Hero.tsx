import { ArrowRight, Check, MonitorSmartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StripCanvas } from '@/components/strip/StripCanvas'
import { Button } from '@/components/ui/button'
import { DEMO_PHOTOS } from '@/lib/demo'

const FACTS = ['Gratis dipakai', 'Tanpa watermark', 'Tanpa login', '6 frame siap pakai']

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="blob top-16 -left-28 h-72 w-72 bg-blob-pink" aria-hidden />
      <div className="blob top-52 -right-16 h-80 w-80 bg-blob-blue opacity-50" aria-hidden />

      <div className="container-page relative">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-3 text-[12.5px] text-muted-foreground">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {FACTS.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden />
                {fact}
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5">
            <MonitorSmartphone className="size-3.5" aria-hidden />
            Chrome · Safari · Edge
          </p>
        </div>

        <div className="grid items-center gap-14 py-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:py-20">
          <div>
            <h1 className="text-[clamp(2.35rem,5.6vw,3.6rem)] leading-[1.05] font-extrabold">
              Pose, pilih{' '}
              <span className="relative inline-block">
                <span
                  className="absolute inset-x-[-8px] top-[32%] bottom-[6%] -z-10 rounded-full bg-blob-pink"
                  aria-hidden
                />
                frame
              </span>
              , unduh.
            </h1>

            <p className="mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-muted-foreground">
              Photobooth Life4Cuts langsung di browser. Empat pose dengan timer, enam frame yang bisa
              dikustom, musik latar, lalu simpan dalam 1200 px tanpa watermark.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-11 rounded-lg px-5 text-[15px]">
                <Link to="/studio">
                  Mulai sesi foto
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 rounded-lg px-5 text-[15px]">
                <a href="#frame">Lihat frame</a>
              </Button>
            </div>

            <dl className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px]">
              {[
                ['Ekspor', '1200 px'],
                ['Format', 'PNG & JPG'],
                ['Unggahan', '0 file'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="absolute top-8 -left-10 hidden w-[122px] -rotate-12 rounded-xl border bg-card p-1.5 shadow-card sm:block">
              <StripCanvas
                mode={1}
                frameId="kawaii"
                photos={[DEMO_PHOTOS[0]]}
                scale={0.3}
                caption="cute"
                label="Contoh frame Pastel Kawaii Cat"
              />
            </div>
            <div className="absolute top-24 -right-10 hidden w-[134px] rotate-12 rounded-xl border bg-card p-1.5 shadow-card sm:block">
              <StripCanvas
                mode={1}
                frameId="chrome"
                photos={[DEMO_PHOTOS[2]]}
                scale={0.3}
                caption="y2k"
                label="Contoh frame Retro Y2K Chrome"
              />
            </div>

            <div className="relative mx-auto w-[min(100%,318px)] -rotate-[2.5deg] rounded-2xl border bg-card p-2.5 shadow-card">
              <StripCanvas
                mode={4}
                frameId="classic"
                photos={DEMO_PHOTOS}
                scale={0.78}
                caption="snapvibe"
                label="Contoh strip Life4Cuts empat foto"
              />
            </div>

            <div className="absolute -bottom-3 left-2 flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-[11.5px] font-medium shadow-xs">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              1200 px · PNG & JPG
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
