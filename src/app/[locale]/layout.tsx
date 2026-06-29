import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "zh" | "ms")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen flex-col bg-[#f3f6f3] text-zinc-950 [--accent:#e8f5ee] [--accent-foreground:#064e3b] [--background:#f3f6f3] [--border:#d5ddd8] [--card:#ffffff] [--card-foreground:#18181b] [--foreground:#18181b] [--input:#d5ddd8] [--muted:#f4f7f5] [--muted-foreground:#52635d] [--popover:#ffffff] [--popover-foreground:#18181b] [--primary:#047857] [--primary-foreground:#ffffff] [--ring:#047857] [--secondary:#eef7f2] [--secondary-foreground:#15372d]">
        <GoogleAnalytics />
        <ServiceWorkerRegister />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Header />
        <main
          id="main-content"
          className="w-full flex-1 px-4 pb-28 pt-8 sm:px-6 lg:pb-10 lg:pl-[284px] lg:pr-10 lg:pt-9"
        >
          {children}
        </main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
