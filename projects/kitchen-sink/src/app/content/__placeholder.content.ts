import { PageContent } from '../shared/page-content.types';

/**
 * Temporary placeholder content so the dev build stays compilable between
 * Task 4 (this shell) and Task 5 (real per-primitive content modules).
 *
 * Task 5 deletes this file — no route should reference it once the real
 * `*.content.ts` modules land.
 */
export const PLACEHOLDER_CONTENT: PageContent = {
  title: 'Placeholder',
  pill: 'service',
  overview: {
    sections: [
      {
        id: 'intro',
        title: 'Intro',
        markdown:
          'This is placeholder content.\n\nReplaced by Task 5 of the docs redesign.',
      },
    ],
    examples: [],
  },
  api: {
    sections: [
      {
        id: 'methods',
        title: 'Methods',
        items: [],
      },
    ],
  },
  examples: [],
};
