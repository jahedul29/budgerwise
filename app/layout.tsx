import type { Metadata, Viewport } from 'next';
import { Syne, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BudgetWise - Smart Personal Budgeting',
  description: 'A premium personal budgeting app with offline-first support',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-mark.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    shortcut: '/logo-mark.svg',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BudgetWise',
  },
};

export const viewport: Viewport = {
  themeColor: '#06D6A0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${outfit.variable}`}>
      <body className="font-sans grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
