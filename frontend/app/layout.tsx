import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Lease Negotiator - Smart Car Lease Contract Analysis",
  description: "AI-powered car lease contract review and negotiation assistant",
  keywords: "car lease, contract analysis, AI negotiation, vehicle lease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers><LoadingSpinner />  {children}</Providers>
      </body>
    </html>
  );
}