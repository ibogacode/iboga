import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { siteConfig } from '@/config/site'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: '/title_logo.jpg',
  },
  openGraph: {
    title: 'Iboga Wellness Institute',
    description: 'Access your workspace, manage your profile, and continue your wellness journey with Iboga Wellness Institute.',
    url: 'https://portal.theibogainstitute.org',
    siteName: 'Iboga Wellness Institute',
    images: [
      {
        url: 'https://portal.theibogainstitute.org/title_logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Iboga Wellness Institute',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iboga Wellness Institute',
    description: 'Access your workspace, manage your profile, and continue your wellness journey.',
    images: ['https://portal.theibogainstitute.org/title_logo.jpg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
