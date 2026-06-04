import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-ini';

/**
 * Renders a markdown string into sanitized HTML, applying Prism syntax
 * highlighting to fenced code blocks (` ```ts `, ` ```html `, ` ```ini `, …).
 *
 * Content is hand-authored under `app/content/` so the XSS surface is
 * internal-only — we deliberately do NOT add DOMPurify. `marked` is run
 * synchronously with GFM enabled and `breaks: false`.
 */
@Component({
  selector: 'markdown-renderer',
  standalone: true,
  template: `<div class="prose" [innerHTML]="html()"></div>`,
})
export class MarkdownRendererComponent {
  readonly source = input.required<string>();

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly html = computed<SafeHtml>(() => {
    const raw = marked.parse(this.source(), {
      async: false,
      gfm: true,
      breaks: false,
    }) as string;
    const highlighted = applyPrismToHtml(raw);
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  });
}

/**
 * Walk every `<code class="language-XXX">…</code>` block emitted by `marked`
 * and replace its contents with the Prism-highlighted equivalent. `marked`
 * has already HTML-escaped the source, so we decode the entities first,
 * highlight, then re-emit. If the grammar isn't loaded, leave the block
 * untouched (still escaped, just unhighlighted).
 */
function applyPrismToHtml(html: string): string {
  return html.replace(
    /<code class="language-([a-z0-9-]+)">([\s\S]*?)<\/code>/g,
    (_match, lang: string, code: string) => {
      const decoded = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const grammar = Prism.languages[lang];
      if (!grammar) {
        return `<code class="language-${lang}">${code}</code>`;
      }
      const highlighted = Prism.highlight(decoded, grammar, lang);
      return `<code class="language-${lang}">${highlighted}</code>`;
    },
  );
}
