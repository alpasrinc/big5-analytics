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
  title: "Big 5 Analytics",
  description:
    "İngiltere, İspanya, İtalya, Almanya, Fransa'nın en büyük 5 ligi (2025/26) ve Şampiyonlar Ligi'nde (2015/16-2024/25) maç, korner, kart ve kapanış oranı verilerini filtreleyip analiz edin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
    >
      <body className="h-dvh overflow-hidden bg-background text-foreground">{children}</body>
    </html>
  );
}
