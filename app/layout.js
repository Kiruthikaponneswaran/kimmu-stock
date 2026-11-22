import './globals.css';
import { IBM_Plex_Sans } from 'next/font/google';
import Providers from './providers';

const font = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export const metadata = { title: 'Kimmu Stock | Inventory', description: 'Inventory, sales, purchase and finance management' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
