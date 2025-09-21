import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Arena Ace',
  description: 'Join and compete in daily tournaments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* 👇 Mobile માં zoom disable / Desktop માં normal */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          media="(max-width: 1024px)"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
          media="(min-width: 1025px)"
        />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
