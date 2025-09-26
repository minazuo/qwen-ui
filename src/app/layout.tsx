import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainSidebar from '../components/MainSidebar';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "小数小科",
  description: "基于大语言模型的AI助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950`}
      >
        <div className="flex h-screen p-4  bg-blue-300">
          <MainSidebar />
          <div className="flex-1 ml-4">
            <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
