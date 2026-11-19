import { ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/site/Reveal'
import { StripCanvas } from '@/components/strip/StripCanvas'
import { DEMO_PHOTOS } from '@/lib/demo'

const POINTS = [
  {
    title: 'Foto tidak pernah diunggah',
    body: 'Pengambilan, crop, filter, dan penyusunan strip terjadi di memori browser. Tutup tab, hilang.',
  },
  {
    title: 'Stream kamera dimatikan',
    body: 'Setelah pose terakhir, track kamera langsung dihentikan — bukan dibiarkan menyala di latar.',
  },
  {
    title: 'Satu request saja',
    body: 'Hanya mood musik yang dikirim ke server. Tidak ada gambar, tidak ada cookie pelacak.',
  },
]

export function PrivacySection() {
  return (
    <section id="privasi" className="scroll-mt-24 py-16 sm:py-20">
      <div className="container-page">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[11.5px] font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                Privasi by default
              </span>
              <h2 className="mt-4 text-[clamp(1.7rem,4vw,2.4rem)] leading-tight font-extrabold">
                Fotomu tidak keluar dari perangkat.
              </h2>
              <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
                Ini bukan janji di halaman kebijakan. Arsitekturnya memang tidak punya endpoint untuk
                gambar — tidak ada tempat menyimpannya.
              </p>

              <ul className="mt-7 space-y-4">
                {POINTS.map((point) => (
                  <li key={point.title} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <div>
                      <p className="text-[14.5px] font-semibold">{point.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-[16px] border bg-card p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between border-b pb-3">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Network
                </p>
                <p className="text-[11px] text-muted-foreground">sesi normal</p>
              </div>
              <ul className="mt-3 space-y-2 font-mono text-[12px] leading-relaxed">
                <li className="flex items-center justify-between gap-3 rounded-md bg-secondary/70 px-2.5 py-1.5">
                  <span className="text-foreground/70">GET /api/music?mood=lofi</span>
                  <span className="text-primary">1×</span>
                </li>
                <li className="flex items-center justify-between gap-3 rounded-md bg-secondary/70 px-2.5 py-1.5">
                  <span className="text-foreground/70">POST /api/photos</span>
                  <span className="text-muted-foreground">tidak ada</span>
                </li>
                <li className="flex items-center justify-between gap-3 rounded-md bg-secondary/70 px-2.5 py-1.5">
                  <span className="text-foreground/70">foto keluar browser</span>
                  <span className="text-muted-foreground">0 byte</span>
                </li>
              </ul>

              <div className="mt-5 flex items-end gap-3">
                <div className="w-[66px] shrink-0">
                  <StripCanvas
                    mode={1}
                    frameId="polaroid"
                    photos={[DEMO_PHOTOS[1]]}
                    scale={0.22}
                    caption="privat"
                    label="Contoh strip dengan frame Polaroid"
                  />
                </div>
                <dl className="grid flex-1 grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-muted-foreground">Ekspor</dt>
                    <dd className="font-semibold">1200 px</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rate limit</dt>
                    <dd className="font-semibold">30 req/menit</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Watermark</dt>
                    <dd className="font-semibold">Tidak ada</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Penyimpanan</dt>
                    <dd className="font-semibold">Memori</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
