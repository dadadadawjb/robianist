import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Robianist', description: 'A roboticist that happens to be a pianist.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
