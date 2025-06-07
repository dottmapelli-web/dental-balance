
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import AppShell from '@/components/layout/app-shell';
import { AuthProvider } from '@/contexts/auth-context'; // Reintrodotto AuthProvider

// import { siteConfig } from '@/config/site'; // Temporaneamente rimosso
// import { ThemeProvider } from "next-themes"; // Temporaneamente rimosso

export const metadata: Metadata = {
  title: "Dental Balance - Test Semplificato",
  description: "Test di caricamento semplificato",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Font links temporaneamente rimossi */}
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased" // Usiamo font-sans di default
        )}
      >
        {/* ThemeProvider temporaneamente rimosso */}
        <AuthProvider> {/* AuthProvider wrappa AppShell */}
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
