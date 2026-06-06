import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { IconSprite } from "@/components/ui/icon";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Street Dog App",
  description: "Track and help street dogs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Street Dog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Ship only the namespaces actually consumed by "use client" components
  // to NextIntlClientProvider. The full catalog (admin, adopt, common, map,
  // dogProfile, partnerClinics, partnerOrgs, report, support, …) is server-
  // rendered and doesn't need to cross to the client bundle on every route.
  // next-intl exposes no `pick()` in this version, so we filter by hand.
  // Client-used namespaces (from useTranslations("…") in "use client"):
  //   addDog, auth, dashboard, dogActions, gallery, healthReport,
  //   missions, nav, tour.
  const CLIENT_NAMESPACES = [
    "addDog",
    "auth",
    "dashboard",
    "dogActions",
    "gallery",
    "healthReport",
    "missions",
    "nav",
    "tour",
  ] as const;
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [
      ns,
      messages[ns],
    ])
  );

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply persisted theme BEFORE hydration to avoid the flash of
            wrong-theme content. Reads localStorage("ui-theme"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ui-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <IconSprite />
        <ServiceWorkerRegister />
        <NextIntlClientProvider messages={clientMessages}>
          {children}
        </NextIntlClientProvider>
        <InstallPrompt />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
