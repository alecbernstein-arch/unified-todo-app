import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo",
  description: "Triage Gmail and iCloud Calendar into one todo list.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // "black" keeps the iPhone status bar readable in both light and dark
    // mode. ("black-translucent" would show white clock/battery text on top
    // of the light theme, where it can't be read.)
    statusBarStyle: "black",
    title: "Todo",
  },
  icons: {
    icon: ["/icons/icon-192.png", "/icons/icon-512.png"],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
