export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ textAlign: "center", marginTop: "50px" }}>
        {/* Logo Image */}
        <img src="/logo.png" alt="App Logo" width="150" />

        <h1>Welcome to PUBG1STAR Tournament</h1>

        {/* Download APK Button */}
        <a href="/PUBG1STAR.apk" download>
          <button
            style={{
              padding: "10px 20px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Download APK
          </button>
        </a>

        {/* Other pages */}
        {children}
      </body>
    </html>
  );
}                                                                                                                                                                                                                                   import type { Metadata } from 'next';
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
      <body className={`${inter.variable} font-body antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
