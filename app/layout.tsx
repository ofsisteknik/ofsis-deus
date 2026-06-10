import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OFSİS Deprem Takip Sistemi",
  description: "Canlı Deprem Takip ve Sismik Veri Analiz Konsolu",
  icons: {
    icon: "/logo.jpg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
