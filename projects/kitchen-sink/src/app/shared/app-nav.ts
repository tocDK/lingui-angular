/**
 * Sidenav data for AppComponent.
 *
 * Categorized into NavSection[] (Getting started / Services / Pipes /
 * Directives / SSR / Guides). The flat `NAV` export is kept as a
 * backwards-compat alias derived from NAV_SECTIONS.
 */

export interface NavItem {
  readonly path: string;
  readonly label: string;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Getting started',
    items: [
      { path: '/getting-started', label: 'Quick start' },
    ],
  },
  {
    title: 'Services',
    items: [
      { path: '/services/lingui-service', label: 'LinguiService' },
    ],
  },
  {
    title: 'Pipes',
    items: [
      { path: '/pipes/t-pipe', label: 'TPipe' },
      { path: '/pipes/t-plural-pipe', label: 'TPluralPipe' },
      { path: '/pipes/t-select-pipe', label: 'TSelectPipe' },
    ],
  },
  {
    title: 'Directives',
    items: [
      { path: '/directives/t-directive', label: 'TDirective' },
    ],
  },
  {
    title: 'SSR',
    items: [
      { path: '/ssr/provide-lingui-ssr', label: 'provideLingui (SSR)' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { path: '/guides/lazy-loading', label: 'Lazy catalog loading' },
      { path: '/guides/change-detection', label: 'Change detection' },
      { path: '/guides/missing-translations', label: 'Missing translations' },
    ],
  },
];

// Backwards-compat alias for code still importing `NAV` from this file.
// Remove once no consumers reference NAV.
export const NAV: readonly NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
