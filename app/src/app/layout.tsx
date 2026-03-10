import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
<<<<<<< Updated upstream
  title: "TennisMatch - Find Tennis Partners",
  description: "Meet tennis players near you, get matched by skill level, and auto-book courts",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TennisMatch",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#15803d",
=======
  title: "TennisMatch - Find Tennis Partners & Book Courts",
  description: "Match with tennis players, form groups, stake credits, and auto-book courts. No-show prevention built in.",
>>>>>>> Stashed changes
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
<<<<<<< Updated upstream
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
=======
      <body className="bg-[#f8fafc] text-slate-900 min-h-screen antialiased">
>>>>>>> Stashed changes
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
