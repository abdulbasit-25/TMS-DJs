/* ============================================================================
   Global styles — Tailwind v4 + shadcn/ui contract
   ----------------------------------------------------------------------------
   Token layering:
     1. Palette      — static ramps (navy, plum, oatmeal, ink, …), theme-agnostic
     2. Semantic     — per-theme runtime tokens (bg-*, text-*, brand, on-*, …)
     3. shadcn       — shared bridge from semantic tokens to the shadcn/ui
                       variable contract (only values may change, never names)

   NOTE: Layers 2→3 use var() indirection, which requires the theme
   attribute/class to be set on <html>. Set BOTH, e.g.:
     document.documentElement.dataset.theme = "dark"
     document.documentElement.classList.add("dark")
   ========================================================================== */

@import "tailwindcss" source(none);
@import "tw-animate-css";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/jetbrains-mono";

@source "../src";

/* Dark is the no-attribute default; also honor the class and attribute explicitly. */
@custom-variant dark (&:is(.dark *, [data-theme="dark"] *));
@custom-variant light (&:is(.light *, [data-theme="light"] *));

@theme inline {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* ===== shadcn/ui variable contract — DO NOT rename these ===== */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* ===== App semantic tokens as utilities =====
     bg-app, bg-surface, bg-surface-2, bg-cta, text-on-cta,
     text-nav, bg-nav-active, text-nav-active-fg, bg-primary-hover, text-error …
     (replaces bg-[var(--color-bg-surface-2)]-style arbitrary values) */
  --color-app: var(--color-bg-app);
  --color-surface: var(--color-bg-surface);
  --color-surface-2: var(--color-bg-surface-2);
  --color-surface-hover: var(--color-bg-surface-hover);
  --color-primary-hover: var(--color-brand-hover);
  --color-cta: var(--color-cta-bg);
  --color-cta-hover: var(--color-cta-bg-hover);
  --color-on-cta: var(--color-cta-text);
  --color-nav: var(--color-nav-text);
  --color-nav-hover: var(--color-nav-text-hover);
  --color-nav-active: var(--color-nav-active-bg);
  --color-nav-active-fg: var(--color-nav-active-text);
  --color-error: var(--color-danger);
}

/* ============================================================================
   1. Palette — theme-independent
   ========================================================================== */
:root {
  --radius: 0.5rem;

  /* Primary — Navy (deep ink-blue shell, not startup blue) */
  --navy-50: #eaf0f7;
  --navy-100: #ccdaea;
  --navy-200: #9ab4d2;
  --navy-300: #6690b9;
  --navy-400: #3d6d9c;
  --navy-500: #24507c;
  --navy-600: #1b3c5e;
  --navy-700: #142c45;
  --navy-800: #0e1f31;
  --navy-900: #09141f;
  --navy-950: #050b12;

  /* Accent / CTA — Plum (rich wine, jewel-tone highlight) */
  --plum-50: #f6edf1;
  --plum-100: #e9d2de;
  --plum-200: #d2a7be;
  --plum-300: #b87a9c;
  --plum-400: #98527c;
  --plum-500: #7a3a62;
  --plum-600: #602c4d;
  --plum-700: #48213a;
  --plum-800: #321728;
  --plum-900: #1e0e18;

  /* Neutrals — Oatmeal/Beige (warm parchment; light theme surfaces + text) */
  --oatmeal-25: #fbf8f2;
  --oatmeal-50: #f6f0e3;
  --oatmeal-100: #ede2c9;
  --oatmeal-200: #e0cfa8;
  --oatmeal-300: #cfb884;
  --oatmeal-400: #b99c61;
  --oatmeal-500: #9c7f49;
  --oatmeal-600: #7d6538;
  --oatmeal-700: #5f4c2a;
  --oatmeal-800: #40331c;
  --oatmeal-900: #241c0f;

  /* Neutrals — Ink (cool navy-charcoal; dark theme surfaces) */
  --ink-100: #d6dae1;
  --ink-200: #b7bec9;
  --ink-300: #929baa;
  --ink-400: #6e7889;
  --ink-500: #4f5868;
  --ink-600: #3a4150;
  --ink-700: #2a303c;
  --ink-800: #1e232c;
  --ink-850: #171b22;
  --ink-900: #10141a;
  --ink-950: #0a0d11;

  /* Status — Moss / Ochre / Brick / Steel */
  --moss-400: #8fae7a;
  --moss-500: #729159;
  --moss-600: #5c7a49;
  --ochre-400: #d9a55a;
  --ochre-500: #c08a3e;
  --ochre-600: #a97429;
  --brick-400: #c97364;
  --brick-500: #ac5445;
  --brick-600: #96392c;
  --steel-400: #7c93a8;
  --steel-500: #647e96;
  --steel-600: #4f6b82;
}

/* ============================================================================
   2. Semantic tokens — DARK (default)
   ========================================================================== */
:root,
.dark,
[data-theme="dark"] {
  color-scheme: dark;

  --color-bg-app: var(--ink-950);
  --color-bg-sidebar: var(--ink-900);
  --color-bg-surface: var(--ink-850);
  --color-bg-surface-2: var(--ink-800);
  --color-bg-surface-hover: color-mix(in oklab, var(--ink-100) 6%, var(--color-bg-surface));
  --color-border: var(--ink-700);
  --color-border-subtle: var(--ink-800);
  --color-overlay: color-mix(in oklab, var(--ink-950) 72%, transparent);

  --color-text-primary: #f4efe6;
  --color-text-secondary: var(--ink-300);
  --color-text-muted: var(--ink-400);
  --color-text-disabled: var(--ink-600);

  --color-brand: var(--navy-400);
  --color-brand-hover: var(--navy-300);
  --color-cta-bg: var(--plum-500);
  --color-cta-bg-hover: var(--plum-400);

  /* Status colors double as SOLID badge/button backgrounds. Light tints in
     dark mode, so the paired on-* text must be dark ink:
     moss-400/ink-950 ≈ 7.9:1 · ochre-400/ink-950 ≈ 8.8:1 ·
     brick-400/ink-950 ≈ 5.7:1 · steel-400/ink-950 ≈ 6.1:1 — all pass AA. */
  --color-success: var(--moss-400);
  --color-warning: var(--ochre-400);
  --color-danger: var(--brick-400);
  --color-info: var(--steel-400);
  --color-on-success: var(--ink-950);
  --color-on-warning: var(--ink-950);
  --color-on-danger: var(--ink-950);
  --color-on-info: var(--ink-950);

  /* Nav active state: color-mix tint of brand over sidebar bg, so it always
     stays visibly distinct from the sidebar regardless of exact bg value. */
  --color-nav-active-bg: color-mix(in oklab, var(--navy-400) 18%, var(--color-bg-sidebar));
  --color-nav-active-text: var(--navy-200);
  --color-nav-text: var(--ink-300);
  --color-nav-text-hover: #f4efe6;

  /* Link gets its own token (navy-300, ~5.8:1 on ink-950) — separate from
     --color-brand (navy-400, ~3.6:1) which is tuned for button fills. */
  --color-link: var(--navy-300);
  --color-link-hover: var(--navy-200);
}

/* ============================================================================
   2. Semantic tokens — LIGHT (opt-in via data-theme="light" or .light)
   ========================================================================== */
[data-theme="light"],
.light {
  color-scheme: light;

  --color-bg-app: var(--oatmeal-25);
  --color-bg-sidebar: #ffffff;
  --color-bg-surface: #ffffff;
  --color-bg-surface-2: var(--oatmeal-50);
  --color-bg-surface-hover: color-mix(in oklab, var(--navy-900) 4%, var(--color-bg-surface));
  --color-border: var(--oatmeal-200);
  --color-border-subtle: var(--oatmeal-100);
  --color-overlay: color-mix(in oklab, var(--navy-950) 45%, transparent);

  --color-text-primary: var(--navy-900);
  --color-text-secondary: var(--navy-600);
  --color-text-muted: var(--oatmeal-600);
  --color-text-disabled: var(--oatmeal-400);

  --color-brand: var(--navy-600);
  --color-brand-hover: var(--navy-700);
  --color-cta-bg: var(--plum-500);
  --color-cta-bg-hover: var(--plum-600);

  /* Darker steps so white foreground on solid badges/buttons clears AA:
     moss-600/white ≈ 4.8:1 · brick-600/white ≈ 7.2:1 · steel-600/white ≈ 5.6:1.
     Exception: ochre-600/white is only 4.03:1 (fails AA), so warning keeps
     dark text in both themes (ochre-600/navy-900 ≈ 4.61:1). */
  --color-success: var(--moss-600);
  --color-warning: var(--ochre-600);
  --color-danger: var(--brick-600);
  --color-info: var(--steel-600);
  --color-on-success: #ffffff;
  --color-on-warning: var(--navy-900);
  --color-on-danger: #ffffff;
  --color-on-info: #ffffff;

  --color-nav-active-bg: color-mix(in oklab, var(--navy-600) 8%, var(--color-bg-sidebar));
  --color-nav-active-text: var(--navy-600);
  --color-nav-text: var(--navy-500);
  --color-nav-text-hover: var(--navy-900);

  --color-link: var(--color-brand);
  --color-link-hover: var(--color-brand-hover);
}

/* ============================================================================
   3. shadcn/ui contract + legacy aliases — shared, resolves via layers 1–2
   ========================================================================== */
:root {
  --background: var(--color-bg-app);
  --foreground: var(--color-text-primary);
  --card: var(--color-bg-surface);
  --card-foreground: var(--color-text-primary);
  --popover: var(--color-bg-surface);
  --popover-foreground: var(--color-text-primary);
  --primary: var(--color-brand);
  --primary-foreground: #ffffff;
  --secondary: var(--color-bg-surface-2);
  --secondary-foreground: var(--color-text-primary);
  --muted: var(--color-bg-surface-2);
  --muted-foreground: var(--color-text-secondary);
  --accent: var(--color-cta-bg);
  --accent-foreground: var(--color-cta-text);
  --destructive: var(--color-danger);
  --destructive-foreground: var(--color-on-danger);
  --success: var(--color-success);
  --success-foreground: var(--color-on-success);
  --warning: var(--color-warning);
  --warning-foreground: var(--color-on-warning);
  --info: var(--color-info);
  --info-foreground: var(--color-on-info);
  --border: var(--color-border);
  --input: var(--color-bg-surface-2);
  --ring: var(--color-brand);
  --chart-1: var(--color-brand);
  --chart-2: var(--color-cta-bg);
  --chart-3: var(--color-info);
  --chart-4: var(--color-warning);
  --chart-5: var(--color-danger);
  --sidebar: var(--color-bg-sidebar);
  --sidebar-foreground: var(--color-nav-text);
  --sidebar-primary: var(--color-brand);
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: var(--color-nav-active-bg);
  --sidebar-accent-foreground: var(--color-nav-active-text);
  --sidebar-border: var(--color-border);
  --sidebar-ring: var(--color-brand);

  --color-cta-text: #ffffff;

  /* Functional aliases used elsewhere in app code */
  --color-bg-primary: var(--color-bg-app);
  --color-bg-secondary: var(--color-bg-surface-2);
  --color-surface-card: var(--color-bg-surface);
  --color-cta: var(--color-cta-bg);
  --color-cta-hover: var(--color-cta-bg-hover);
  --color-error: var(--color-danger);
}

/* ============================================================================
   Base
   ========================================================================== */
@layer base {
  * {
    border-color: var(--border);
  }

  :root {
    accent-color: var(--color-brand);
  }

  html,
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    font-feature-settings: "cv11", "ss01";
  }

  .font-mono,
  code,
  pre,
  kbd {
    font-family: var(--font-mono);
  }

  ::selection {
    background: color-mix(in oklab, var(--primary) 35%, transparent);
  }

  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}

/* ============================================================================
   Utilities & effects
   ========================================================================== */
@utility scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

/* Grid overlay — uses currentColor so it adapts to whatever text color the
   containing panel has (white-on-dark panel, navy-on-light panel, etc.). */
.theme-grid-pattern {
  background-image:
    linear-gradient(currentColor 1px, transparent 1px),
    linear-gradient(90deg, currentColor 1px, transparent 1px);
  background-size: 28px 28px;
}

/* Animated route line — one definition. -14 matches the 6+8 dash period. */
.dj-route-line {
  animation: dj-route-dash 1.2s linear infinite;
}

@keyframes dj-route-dash {
  to {
    stroke-dashoffset: -14;
  }
}

/* Respect reduced motion globally (covers the route line too). Note: this
   also freezes spinners — acceptable tradeoff for an internal TMS tool. */
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
/* Floating notification chip */
@keyframes dj-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
.animate-float {
  animation: dj-float 5s ease-in-out infinite;
}

/* Load card progress bar grows in on mount */
@keyframes dj-progress-grow {
  from {
    width: 0%;
  }
}
.dj-load-progress {
  animation: dj-progress-grow 1.1s 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
/* Error shake — blanket reduced-motion rule already disables this */
@keyframes dj-shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-3px);
  }
  40%,
  60% {
    transform: translateX(3px);
  }
}
.dj-shake {
  animation: dj-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

/* Film-grain texture for the brand panel (kills gradient banding) */
.dj-noise {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

/* Autofill: stop Chrome from painting its default cream background over
   themed inputs (the classic dark-mode login blight) */
@layer base {
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--foreground);
    -webkit-box-shadow: 0 0 0 1000px var(--card) inset;
    caret-color: var(--foreground);
    transition: background-color 9999s ease-in-out 0s;
  }
}
/* Floating notification chip */
@keyframes dj-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
.animate-float {
  animation: dj-float 5s ease-in-out infinite;
}

/* Load card progress bar grows in on mount */
@keyframes dj-progress-grow {
  from {
    width: 0%;
  }
}
.dj-load-progress {
  animation: dj-progress-grow 1.1s 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

/* Error alert shake */
@keyframes dj-shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-3px);
  }
  40%,
  60% {
    transform: translateX(3px);
  }
}
.dj-shake {
  animation: dj-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

/* Film-grain texture for the brand panel */
.dj-noise {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

/* Autofill: stop Chrome painting its default cream over themed inputs */
@layer base {
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--foreground);
    -webkit-box-shadow: 0 0 0 1000px var(--card) inset;
    caret-color: var(--foreground);
    transition: background-color 9999s ease-in-out 0s;
  }
}
