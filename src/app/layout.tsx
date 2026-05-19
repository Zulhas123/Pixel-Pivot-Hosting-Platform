import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { Container } from "@/components/Container";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <NavBar />
        <main className="flex-1 py-10">
          <Container>{children}</Container>
        </main>
        <footer className="border-t border-black/10 py-8">
          <Container>
            <p className="text-sm text-black/60">
              © {new Date().getFullYear()} Pixel Pivot Hosting. Manual payments
              supported: bKash, Nagad, Rocket.
            </p>
          </Container>
        </footer>
      </body>
    </html>
  );
}
