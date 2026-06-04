/**
 * Type schema for hand-authored documentation content modules.
 *
 * Each route under the new docs IA (services / pipes / directives / SSR /
 * guides) provides one `PageContent` constant exported from
 * `app/content/<key>.content.ts`. The shell (`ApiPageComponent`) renders it
 * into the Overview / API / Examples tabs.
 */

export interface PageContent {
  title: string;
  pill: 'service' | 'pipe' | 'directive' | 'provider' | 'guide';
  overview: OverviewTab;
  api: ApiTab;
  examples: ExampleEntry[];
}

export interface OverviewTab {
  sections: OverviewSection[];
  /** Keys into EXAMPLE_COMPONENTS — rendered inline in the Overview tab. */
  examples: string[];
}

export interface OverviewSection {
  id: string;
  title: string;
  markdown: string;
}

export interface ApiTab {
  sections: ApiSection[];
}

export interface ApiSection {
  id: string;
  title: string;
  items: ApiItem[];
}

export interface ApiItem {
  id: string;
  /** Exact TypeScript signature, e.g. `t$(descriptor: MessageDescriptor | string): Signal<string>`. */
  signature: string;
  /** Short prose (markdown). */
  description: string;
  /** Optional source-key for an inline mini-example. */
  example?: string;
}

export interface ExampleEntry {
  key: string;
  title: string;
  /** When true, the example card also reveals the matching `<key>.example.po` snippet. */
  showCatalog?: boolean;
}
