import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Lora } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const fontSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const fontSerif = Lora({ subsets: ["latin"], variable: "--font-serif" });
const fontMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Catat",
  description: "Pencatatan pengeluaran konstruksi",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Catat" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider>
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
