import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'Naughty Den',
  description: 'A global community for creators and photo seekers.',
  icons: {
    icon: '/favicon.png',
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {/* PWA service worker registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function(){
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(){});
              });
            }
          })();
        `}}
        />
        {children}
      </body>
    </html>
  );
}
