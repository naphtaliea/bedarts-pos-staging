import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bedarts Cold Supplies",
    short_name: "Bedarts POS",
    description: "POS and Management System for Bedarts Cold Supplies",
    start_url: "/cashier",
    display: "standalone",
    background_color: "#060F40",
    theme_color: "#060F40",
    orientation: "landscape-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
