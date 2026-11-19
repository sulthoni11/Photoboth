import { Link } from 'react-router-dom'
import { Logo } from './Logo'

const COLUMNS = [
  {
    title: 'Produk',
    links: [
      { label: 'Studio kamera', to: '/studio' },
      { label: 'Katalog frame', to: '/#frame' },
      { label: 'Cara kerja', to: '/#cara-kerja' },
    ],
  },
  {
    title: 'Privasi',
    links: [
      { label: 'Pemrosesan lokal', to: '/#privasi' },
      { label: 'Tanpa watermark', to: '/#faq' },
      { label: 'Izin kamera', to: '/#faq' },
    ],
  },
  {
    title: 'Sumber',
    links: [
      { label: 'Jamendo Music', to: '/#faq' },
      { label: 'Unsplash (foto contoh)', to: '/#faq' },
      { label: 'Lisensi Creative Commons', to: '/#faq' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface-soft">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
              Photobooth Life4Cuts di browser. dibuat untuk sesi foto yang cepat, privat, dan tidak
              bikin repot.
            </p>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Semua pemrosesan gambar terjadi di perangkat pengguna.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith('/#') ? (
                      <a
                        href={link.to}
                        className="text-[13px] text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-[13px] text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t pt-5 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SnapVibe Studio</p>
          <p>Dibangun dengan React, Canvas, dan tailwind. Tanpa pelacak.</p>
        </div>
      </div>
    </footer>
  )
}
