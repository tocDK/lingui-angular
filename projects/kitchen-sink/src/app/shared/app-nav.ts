/**
 * Sidenav data for AppComponent.
 *
 * Currently flat — matches the pre-redesign layout. Task 6 of the docs-redesign
 * plan replaces NAV with a categorized `NavSection[]` (Getting started /
 * Services / Pipes / Directives / SSR / Guides). The type contract is
 * stable from this task forward.
 */

export interface NavItem {
  readonly path: string;
  readonly label: string;
}

export interface NavSection {
  /** null = no subheader (legacy/flat fallback). */
  readonly title: string | null;
  readonly items: readonly NavItem[];
}

// Current flat structure — replaced in Task 6 with categorized sections.
export const NAV: readonly NavItem[] = [
  { path: '/basic', label: 'Basic' },
  { path: '/params', label: 'Params' },
  { path: '/plural', label: 'Plural' },
  { path: '/select', label: 'Select' },
  { path: '/context', label: 'Context' },
  { path: '/explicit-id', label: 'Explicit IDs' },
  { path: '/lazy', label: 'Lazy' },
  { path: '/ssr', label: 'SSR' },
  { path: '/cd', label: 'Change det.' },
  { path: '/missing', label: 'Missing' },
];
