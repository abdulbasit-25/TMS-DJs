import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { usePortalSettings } from "../hooks/use-portal-settings";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic browser title
 *
 * The root route's `head()` function cannot directly use React hooks.
 * Therefore, the persisted portal settings are consumed here instead.
 *
 * The static title defined in `head()` remains the fallback while the
 * settings request is loading or unavailable.
 */
function DynamicDocumentTitle() {
  const { companyName } = usePortalSettings();

  useEffect(() => {
    const trimmedCompanyName = companyName.trim();

    if (trimmedCompanyName) {
      document.title = `${trimmedCompanyName} | Secure Agent Portal`;
    } else {
      document.title = "TMS Freight Portal | Secure Agent Portal";
    }
  }, [companyName]);

  return null;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },

      /*
       * Static fallback.
       *
       * DynamicDocumentTitle updates document.title after the persisted
       * portal settings have loaded.
       */
      {
        title: "TMS Freight Portal | Secure Agent Portal",
      },

      {
        name: "description",
        content: "Secure internal portal for freight agents and operations staff.",
      },

      {
        name: "keywords",
        content: "freight broker, logistics, dispatch, loads, carriers, trucking",
      },

      {
        name: "author",
        content: "TMS Freight Portal",
      },

      {
        name: "robots",
        content: "noindex,nofollow",
      },

      {
        name: "theme-color",
        content: "#0F172A",
      },

      {
        property: "og:title",
        content: "TMS Freight Portal | Secure Agent Portal",
      },

      {
        property: "og:description",
        content: "Internal operations portal for authorized personnel.",
      },

      {
        property: "og:type",
        content: "website",
      },

      {
        property: "og:url",
        content: "https://djs-portal.vercel.app",
      },

      {
        property: "og:image",
        content: "https://djs-portal-tms.vercel.app/og-image.jpg",
      },

      {
        property: "og:image:alt",
        content: "TMS Freight Portal secure employee portal preview",
      },

      {
        property: "og:site_name",
        content: "TMS Freight Portal",
      },

      {
        name: "twitter:card",
        content: "summary_large_image",
      },

      {
        name: "twitter:title",
        content: "TMS Freight Portal | Secure Agent Portal",
      },

      {
        name: "twitter:description",
        content: "Internal operations portal for authorized personnel.",
      },

      {
        name: "twitter:image",
        content: "https://djs-portal-tms.vercel.app/og-image.jpg",
      },

      {
        name: "twitter:image:alt",
        content: "TMS Freight Portal secure employee portal preview",
      },

      {
        name: "application-name",
        content: "TMS Freight Portal",
      },
    ],

    links: [
      {
        rel: "icon",
        href: "/favicon_io/favicon.ico",
        sizes: "any",
      },

      {
        rel: "icon",
        type: "image/png",
        href: "/favicon_io/favicon-32x32.png",
        sizes: "32x32",
      },

      {
        rel: "icon",
        type: "image/png",
        href: "/favicon_io/favicon-16x16.png",
        sizes: "16x16",
      },

      {
        rel: "apple-touch-icon",
        href: "/favicon_io/apple-touch-icon.png",
      },

      {
        rel: "manifest",
        href: "/favicon_io/site.webmanifest",
      },

      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const themeInit = `
    (function() {
      try {
        const saved = window.localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme =
          saved === 'light' || saved === 'dark'
            ? saved
            : (prefersDark ? 'dark' : 'light');

        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle(
          'dark',
          theme === 'dark'
        );
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      }
    })();
  `;

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
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
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicDocumentTitle />

      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
