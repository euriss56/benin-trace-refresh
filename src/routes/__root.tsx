import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ChatBot } from "@/components/ChatBot";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="benin-stripe mb-8 rounded-full" />
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 shadow-elegant"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TraceIMEI-BJ — Vérifiez et déclarez les téléphones volés au Bénin" },
      {
        name: "description",
        content:
          "Plateforme ML de traçabilité des téléphones volés au Bénin. Vérification IMEI gratuite, déclarations sécurisées, accès police.",
      },
      { name: "author", content: "TraceIMEI-BJ" },
      { property: "og:title", content: "TraceIMEI-BJ — Vérifiez et déclarez les téléphones volés au Bénin" },
      { property: "og:description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TraceIMEI-BJ — Vérifiez et déclarez les téléphones volés au Bénin" },
      { name: "twitter:description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { name: "description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5df1f1f-80ae-48e9-9354-ea38493bf72d/id-preview-ce548b45--b57073e8-a49b-4570-9672-4b128e38e2c4.lovable.app-1776843584301.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5df1f1f-80ae-48e9-9354-ea38493bf72d/id-preview-ce548b45--b57073e8-a49b-4570-9672-4b128e38e2c4.lovable.app-1776843584301.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Outlet />
              <ChatBot />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
