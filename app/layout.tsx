import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oddwise Out — Think odd. Stand out.",
  description: "A fast multiplayer rare-answer game for 3–10 players. Think odd, score big, and stand out.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
