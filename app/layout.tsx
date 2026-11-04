import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Ciuati – La Saga', description: 'La saga a fumetti dei Ciuati.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body>{children}</body></html>; }
