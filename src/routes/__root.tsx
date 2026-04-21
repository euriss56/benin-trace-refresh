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
      { title: "Lovable App" },
      {
        name: "description",
        content:
          "Vérifiez et déclarez les téléphones volés au Bénin. Plateforme ML pour dealers, ateliers de réparation et forces de l'ordre.",
      },
      { name: "author", content: "TraceIMEI-BJ" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { name: "twitter:description", content: "Benin Trace Refresh is a web application for tracing phone numbers in Benin." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06ac6cdc-1e3d-4588-8a6a-24b6c0c39a23/id-preview-f35df07c--b57073e8-a49b-4570-9672-4b128e38e2c4.lovable.app-1776796331712.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06ac6cdc-1e3d-4588-8a6a-24b6c0c39a23/id-preview-f35df07c--b57073e8-a49b-4570-9672-4b128e38e2c4.lovable.app-1776796331712.png" },
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
