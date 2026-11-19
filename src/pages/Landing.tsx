import { ClosingCta } from '@/components/landing/ClosingCta'
import { FrameMarquee, FramesSection } from '@/components/landing/FrameShowcase'
import { GallerySection } from '@/components/landing/GallerySection'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PrivacySection } from '@/components/landing/PrivacySection'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { ChevronDown } from 'lucide-react'

const FAQ = [
  {
    q: 'Apakah foto saya disimpan di server?',
    a: 'Tidak. Kamera, crop, filter, dan penyusunan frame berjalan di memori browser. Server hanya menerima permintaan daftar musik, tanpa data gambar. Menutup tab akan menghapus semuanya.',
  },
  {
    q: 'Perlu akun atau aplikasi tambahan?',
    a: 'Tidak ada akun, tidak ada unduhan aplikasi. Butuh browser modern (Chrome, Safari 17+, Edge) yang mendukung akses kamera lewat HTTPS.',
  },
  {
    q: 'Kenapa hasil ekspornya 1200 px?',
    a: 'Lebar 1200 px adalah kompromi terbaik antara tajam untuk Instagram Story dan ukuran file yang tetap ringan. PNG dipakai untuk kualitas penuh, JPG untuk berbagi cepat.',
  },
  {
    q: 'Bagaimana kalau kamera tidak tersedia atau izin ditolak?',
    a: 'Kamu bisa memakai foto dari galeri lewat tombol "Gunakan foto dari galeri". Semua pemrosesan tetap lokal dan fitur frame serta ekspor berjalan sama.',
  },
  {
    q: 'Dari mana musiknya?',
    a: 'Trek streaming berasal dari Jamendo (lisensi Creative Commons) dan diproksi lewat server agar API key tidak terekspos. Kalau API tidak tersedia, ada lima loop yang disintesis langsung di browser.',
  },
]

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FrameMarquee />
        <HowItWorks />
        <FramesSection />
        <GallerySection />
        <PrivacySection />

        <section id="faq" className="scroll-mt-24 py-16 sm:py-20">
          <div className="container-page">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-[clamp(1.7rem,4vw,2.3rem)] font-extrabold">Yang sering ditanya.</h2>
              <p className="mt-2 text-[14.5px] text-muted-foreground">
                Jawaban singkat, tanpa syarat tersembunyi.
              </p>

              <div className="mt-7 border-t">
                {FAQ.map((item) => (
                  <details key={item.q} className="group border-b">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[14.5px] font-semibold [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="max-w-[62ch] pb-4 text-[13.5px] leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  )
}
