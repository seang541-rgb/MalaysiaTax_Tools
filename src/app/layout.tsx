import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MYTax - Malaysia Tax Calculator",
    template: "%s | MYTax",
  },
  description:
    "Free Malaysia tax calculator — personal income tax, corporate tax, PCB, EPF/SOCSO/EIS, SST. Trilingual (EN/ZH/BM).",
  keywords: [
    "Malaysia tax calculator",
    "LHDN",
    "income tax Malaysia",
    "PCB calculator",
    "corporate tax Malaysia",
    "EPF calculator",
    "SOCSO calculator",
    "SST calculator",
    "马来西亚税务计算器",
    "kalkulator cukai Malaysia",
  ],
  authors: [{ name: "MYTax" }],
  creator: "MYTax",
  metadataBase: new URL("https://mytax.my"),
  openGraph: {
    type: "website",
    locale: "en_MY",
    alternateLocale: ["zh_CN", "ms_MY"],
    url: "https://mytax.my",
    siteName: "MYTax",
    title: "MYTax - Free Malaysia Tax Calculator",
    description:
      "Calculate personal tax, corporate tax, PCB, EPF/SOCSO/EIS, and SST — free, trilingual, instant results.",
    images: [
      {
        url: "/icons/icon.svg",
        width: 512,
        height: 512,
        alt: "MYTax Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYTax - Free Malaysia Tax Calculator",
    description:
      "Calculate personal tax, corporate tax, PCB, EPF/SOCSO/EIS, and SST — free, trilingual.",
    images: ["/icons/icon.svg"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
