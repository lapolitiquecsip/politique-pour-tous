import type { Metadata } from "next";
import { DM_Sans, Staatliches, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers";
import PremiumButton from "@/components/premium/PremiumButton";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const staatliches = Staatliches({
  variable: "--font-staatliches",
  subsets: ["latin"],
  weight: ["400"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LA POLITIQUE C SIMPLE",
  description: "Comprendre la politique française simplement.",
};

import GlossaryProvider from "@/components/providers/GlossaryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${staatliches.variable} ${playfairDisplay.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <GlossaryProvider>
            <Header />
            <main className="flex-1 pt-16">
              {children}
            </main>
            <Footer />
            <PremiumButton />
          </GlossaryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
