export const siteConfig = {
  name: 'Iboga',
  description: 'Iboga wellness institute',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
  links: {
    github: 'https://github.com/your-org/iboga',
  },
  creator: 'Iboga Team',
}

export type SiteConfig = typeof siteConfig


