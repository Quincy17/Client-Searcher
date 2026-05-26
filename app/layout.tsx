import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClientSearcher - Lead Gen & Outreach Automation",
  description: "IT Agency Automated Client Discovery & Personalised WhatsApp Outreach System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-row bg-[#080710] text-[#f3f4f6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
