import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "BuyDown Indy",
  description:
    "Indianapolis-area homes where the seller pays concessions. See what that money does as a buydown compared with a price cut.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
