import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/header";

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
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="container mx-auto px-4 py-8 flex-1">
            {children}
          </main>
          <footer className="border-t bg-white py-6 text-center text-xs text-muted-foreground">
            <div className="container mx-auto px-4">
              <p>&copy; {new Date().getFullYear()} MYTax. All rights reserved.</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
