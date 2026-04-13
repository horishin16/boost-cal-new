import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BoostCal - スケジュール調整',
  description: 'Boost Consulting 社内向けスケジュール調整アプリ',
};

function Header() {
  return (
    <header className="bg-blue-700 text-white py-4">
      <div className="container mx-auto px-4">
        <h1 className="text-xl font-bold">BoostCal</h1>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>&copy; 2026 Boost Consulting</p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-noto-sans-jp)]">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
