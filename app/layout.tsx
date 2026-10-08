import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const _geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: { default: `${BRAND_NAME} | ${BRAND_TAGLINE}`, template: `%s | ${BRAND_NAME}` },
  applicationName: BRAND_NAME,
  description:
    'Acompanhe suas metas de estudo, o progresso no edital e a evolução por disciplina em um só lugar.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/logo-el-branca-transparente.png', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  userScalable: true,
  themeColor: '#181718',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark bg-background">
      <body className={`${_geistSans.variable} ${_geistMono.variable} font-sans antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

