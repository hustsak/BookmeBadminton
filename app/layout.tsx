import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { PwaManager } from "@/components/PwaManager";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#17201c" },
  ],
};

export const metadata: Metadata = {
  applicationName: "BookMeBadminton",
  title: {
    default: "BookMeBadminton · Court Booking & Community",
    template: "%s · BookMeBadminton",
  },
  description:
    "Real-time badminton court booking, friendly sparring matches, and player community in Hanoi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookMeBadminton",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className={`${jakarta.className} antialiased`}>
        <AppProvider>
          <PwaManager />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}