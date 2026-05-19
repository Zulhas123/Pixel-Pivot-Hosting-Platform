import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { Container } from "@/components/Container";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixel Pivot Hosting",
  description: "Domain & web hosting platform (Bangladesh-focused).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-white text-black">
        <NavBar />
        <main className="flex-1 py-6">
          <Container>{children}</Container>
        </main>
        <footer className="border-t border-black/10 bg-zinc-100 py-5 text-zinc-700">
          <Container>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-600">
                  © {new Date().getFullYear()}{" "}
                  <span className="font-semibold text-zinc-900">Pixel Pivot</span>{" "}
                  Hosting
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Manual payments supported: bKash, Nagad, Rocket.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Link className="text-zinc-700 hover:text-zinc-950" href="/hosting">
                  Hosting
                </Link>
                <Link className="text-zinc-700 hover:text-zinc-950" href="/domains">
                  Domains
                </Link>
                <Link className="text-zinc-700 hover:text-zinc-950" href="/pricing">
                  Pricing
                </Link>
                <Link className="text-zinc-700 hover:text-zinc-950" href="/contact">
                  Contact
                </Link>
              </div>
            </div>
          </Container>
        </footer>
      </body>
    </html>
  );
}
