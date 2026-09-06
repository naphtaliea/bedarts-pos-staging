import type { Metadata, Viewport } from "next";
import { Archivo, Abril_Fatface } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const abril = Abril_Fatface({ weight: "400", subsets: ["latin"], variable: "--font-abril", display: "swap" });

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
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${abril.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
