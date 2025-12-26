import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Daily Stacks Raffle | Win STX Every Day",
  description: "A decentralized daily lottery on the Stacks blockchain. Buy tickets, win the pot!",
  keywords: ["Stacks", "STX", "Lottery", "Raffle", "Blockchain", "Crypto", "Bitcoin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
