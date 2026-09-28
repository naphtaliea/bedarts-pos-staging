import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";
import { StagingBanner } from "@/components/staging-banner";
import { UpdateBanner } from "@/components/update-banner";
import { AuthRecoveryHandler } from "@/components/auth-recovery-handler";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const bigShoulders = Big_Shoulders({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  display: "swap",
});

const IS_STAGING = process.env.NEXT_PUBLIC_APP_ENV === "staging";

export const metadata: Metadata = {
  title: IS_STAGING ? "[STAGING] Bedarts Cold Supplies" : "Bedarts Cold Supplies",
  description: "POS and Management System",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon-192.png",
    apple: { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: IS_STAGING ? "[STAGING] Bedarts POS" : "Bedarts POS",
  },
};

export const viewport: Viewport = {
  themeColor: "#060F40",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${bigShoulders.variable} h-full`}>
      <body className="h-full flex flex-col">
        <StagingBanner />
        <AuthRecoveryHandler />
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        <UpdateBanner />
      </body>
    </html>
  );
}
