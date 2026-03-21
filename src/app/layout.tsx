import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Scenarical — Marketing Decisions, Powered by Real Data",
  description:
    "26+ free interactive calculators for digital marketers & freelancers. Compare scenarios, benchmark against industry averages, and share data-driven decisions with your team.",
  metadataBase: new URL("https://scenarical.com"),
  openGraph: {
    title: "Scenarical — Marketing Decisions, Powered by Real Data",
    description:
      "26+ free interactive calculators for digital marketers & freelancers.",
    type: "website",
    siteName: "Scenarical",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
