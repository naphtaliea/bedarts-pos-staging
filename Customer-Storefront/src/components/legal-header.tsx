import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function LegalHeader() {
  return (
    <header
      className="sticky top-0 z-40 px-4 sm:px-6 flex items-center bg-navy"
      style={{ height: "var(--nav-height-sm)" }}
    >
      <Link
        href="/"
        className="flex items-center gap-1.5 h-11 -ml-2 pl-2 pr-3 rounded-lg text-white text-sm font-medium hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Back to shop
      </Link>
    </header>
  );
}
