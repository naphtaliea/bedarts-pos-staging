import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const bigShoulders = Big_Shoulders({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bedarts Cold Supplies",
  description: "POS and Management System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bedarts POS",
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
      <body className="h-full">{children}</body>
    </html>
  );
}
