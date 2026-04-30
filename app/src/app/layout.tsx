import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { PipelineProvider } from "@/context/pipeline-context";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "X AI — Viral Content Generator",
  description: "Analyze viral X posts and generate ready-to-publish content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>
          <PipelineProvider>
            <SidebarProvider>
              <AppSidebar />
              <main className="flex-1 overflow-auto min-h-screen">
                <TopBar />
                <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
              </main>
            </SidebarProvider>
          </PipelineProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
