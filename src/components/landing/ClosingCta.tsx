import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ShimmerButton } from '@/components/ui/shimmer-button'

export function ClosingCta() {
  const navigate = useNavigate()

  return (
    <section className="py-14 sm:py-16">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[24px] border bg-card px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="blob top-[-40px] left-[12%] h-56 w-56 bg-blob-pink opacity-80" aria-hidden />
          <div className="blob right-[10%] bottom-[-60px] h-56 w-56 bg-blob-blue opacity-70" aria-hidden />

          <div className="relative">
            <h2 className="text-[clamp(1.7rem,4.4vw,2.5rem)] leading-tight font-extrabold">
              Siap bikin strip pertamamu?
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Cukup izinkan kamera, ambil empat pose, dan unduh. Rata-rata selesai di bawah satu menit.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ShimmerButton
                onClick={() => navigate('/studio')}
                background="var(--primary)"
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="4s"
                borderRadius="8px"
                className="h-11 gap-2 px-5 text-[15px] font-medium"
              >
                Mulai sesi foto
                <ArrowRight className="size-4" aria-hidden />
              </ShimmerButton>
              <p className="text-[12.5px] text-muted-foreground">Tanpa login · tanpa watermark</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
