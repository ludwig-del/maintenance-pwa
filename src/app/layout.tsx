import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/i18n/LangContext';
import LangToggle from '@/components/shared/LangToggle';

export const metadata: Metadata = {
  title: 'MaintTrack',
  description: 'Shop-floor maintenance ticketing system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MaintTrack',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased bg-gray-50">
        <LangProvider>
          {children}
          <LangToggle />
        </LangProvider>
      </body>
    </html>
  );
}
