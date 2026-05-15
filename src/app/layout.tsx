import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFTP Web Client',
  description: 'Production-ready web-based SFTP client',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
