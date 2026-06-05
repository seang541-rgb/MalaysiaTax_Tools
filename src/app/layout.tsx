import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MYTax - Malaysia Tax Calculator",
  description: "Free Malaysia personal income tax calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
