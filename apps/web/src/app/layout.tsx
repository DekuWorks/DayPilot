import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://daypilot.co"
  ),
  title: "DayPilot — Plan. Pilot. Perform.",
  description:
    "One intelligent workspace for your calendar, tasks, meetings, notes, and daily planning.",
  icons: {
    icon: "/brand/favicon.svg",
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    title: "DayPilot — Plan. Pilot. Perform.",
    description:
      "Bring your calendar, tasks, meetings, and daily planning into one intelligent workspace.",
    images: [{ url: "/brand/dashboard-preview.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
