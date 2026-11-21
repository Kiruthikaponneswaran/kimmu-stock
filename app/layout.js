import './globals.css';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import Providers from './providers';

const head = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-head' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body' });

export const metadata = { title: 'Kimmu Stock | Inventory', description: 'Mini inventory system for products, sales and customers' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
