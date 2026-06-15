import type { Metadata } from "next";
import { Oswald, Barlow, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import { Providers } from "./providers";

// Condensed display face for headings, big numbers, and labels.
const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Workhorse body face.
const body = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stride — autoregulated training",
  description:
    "Plan mesocycles, log your sets, and let recovery feedback drive next week's volume.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}
