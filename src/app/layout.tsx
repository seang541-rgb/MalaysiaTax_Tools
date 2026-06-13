import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_MY",
    alternateLocale: ["zh_CN", "ms_MY"],
    url: SITE_URL,
    siteName: "MYTax",
    title: "MYTax - Free Malaysia Tax Calculator",
    description:
      "Calculate personal tax, corporate tax, PCB, EPF/SOCSO/EIS, and SST — free, trilingual, instant results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MYTax - Free Malaysia Tax Calculator",
    description:
      "Calculate personal tax, corporate tax, PCB, EPF/SOCSO/EIS, and SST — free, trilingual.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      "YAPi5jfisYhQh1qtyxGPPkoPdoGSGTSlvcF9JBZlBPE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <meta name="theme-color" content="#18181b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
        {children}
      </body>
    </html>
  );
}
