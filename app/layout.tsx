import type { Metadata } from "next";
import { Cinzel, Geist } from "next/font/google";
import { COURT_NAME, COURT_TAGLINE } from "@/lib/court";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: COURT_NAME,
  description: `An AI courtroom for petty friend-group disputes. ${COURT_TAGLINE}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
