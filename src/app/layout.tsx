import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { AuthHashHandler } from "@/components/auth/AuthHashHandler";
import { ToastProvider } from "@/components/ui/Toast";
import { supabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "BuyDown Indy",
  description:
    "Indianapolis-area homes where the seller pays concessions. See what that money does as a buydown compared with a price cut.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  openGraph: { siteName: "BuyDown Indy", images: [{ url: "/search-bg.jpg", alt: "BuyDown Indy" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <ToastProvider>
          {supabaseConfigured && <AuthHashHandler />}
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
