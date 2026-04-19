import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jukebox',
  description: 'Spotify Jukebox — add songs, vote, enjoy',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#191414',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-spotify-black text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
