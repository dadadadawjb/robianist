import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
export const metadata: Metadata = { title: 'Robianist.js', description: 'A roboticist that happens to be a pianist, in your browser.' };
// Extensions can add root attributes before hydration; keep checks on body and app content.
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><body><Script async src="https://www.googletagmanager.com/gtag/js?id=G-T5BVW5R0CH" strategy="afterInteractive"/><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-T5BVW5R0CH');`}</Script>{children}</body></html>; }
