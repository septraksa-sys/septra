import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Septra - Pharmaceutical Procurement Platform',
  description: 'Comprehensive B2B pharmaceutical procurement platform streamlining supply chain from demand to delivery',
  keywords: 'pharmaceutical, procurement, B2B, supply chain, pharmacy, supplier, RFQ, bidding',
  authors: [{ name: 'Septra Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Septra - Pharmaceutical Procurement Platform',
    description: 'Streamline pharmaceutical procurement from demand aggregation to delivery tracking',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
