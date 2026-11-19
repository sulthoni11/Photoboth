import { Camera, Download, Palette } from 'lucide-react'
import { Reveal } from '@/components/site/Reveal'

const STEPS = [
  {
    icon: Camera,
    title: 'Ambil 1–4 pose',
    body: 'Nyalakan kamera, pilih timer 3, 5, atau 10 detik. Hitung mundur besar dan efek flash menjaga ritme — ada retake kalau ada yang meleset.',
    tint: 'bg-blob-pink/70',
  },
  {
    icon: Palette,
    title: 'Pilih frame & filter',
    body: 'Tukar keenam frame, ubah warna dasar, dan tulis caption singkat. Pratinjau berubah kurang dari 50 ms karena dirender langsung di canvas.',
    tint: 'bg-blob-blue/70',
  },
  {
    icon: Download,
    title: 'Unduh atau bagikan',
    body: 'Simpan PNG 1200 px atau JPG yang lebih ringan. Di ponsel bisa langsung dibagikan ke aplikasi lain lewat Web Share API.',
    tint: 'bg-blob-butter/80',
  },
]

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 py-4 sm:py-8">
      <div className="container-page">
        <div className="relative rounded-[20px] border bg-surface-soft px-5 py-12 sm:px-8 sm:py-16">
          <svg
            className="pointer-events-none absolute inset-x-10 top-[86px] hidden h-16 w-[calc(100%-5rem)] lg:block"
            viewBox="0 0 1000 64"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M40 46C140 4 220 58 330 34S520 2 620 30s190 34 300 6"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2"
              strokeDasharray="5 8"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative text-center">
            <h2 className="text-[clamp(1.7rem,4vw,2.3rem)] font-extrabold">Cara kerjanya.</h2>
            <p className="mx-auto mt-2 max-w-[48ch] text-[14.5px] text-muted-foreground">
              Tiga langkah, tanpa instal aplikasi dan tanpa membuat akun.
            </p>
          </div>

          <div className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05}>
                <article className="flex h-full flex-col rounded-[14px] border bg-card p-5 shadow-xs">
                  <div className={`flex size-11 items-center justify-center rounded-xl ${step.tint}`}>
                    <step.icon className="size-5 text-foreground/80" aria-hidden />
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <h3 className="text-[15.5px] font-semibold">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
