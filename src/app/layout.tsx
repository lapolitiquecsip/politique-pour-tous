import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "La Politique, C'est Simple",
  description: "Comprendre la politique française simplement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
