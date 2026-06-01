import { Component as Cmp, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TPipe } from './t.pipe';

@Component({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'hello' | t }}</span>`,
})
class HostComponent {}

@Cmp({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'Hello, {name}' | t: { name: 'Alice' } }}</span>`,
})
class HostWithValues {}

@Cmp({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'Open' | t: { $context: 'verb' } }}</span>`,
})
class HostWithContext {}

describe('TPipe — plain', () => {
  it('returns translated text for the active locale', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader: vi.fn(async (l: string) => ({
            messages: { hello: l === 'fr' ? 'Bonjour' : 'Hello' },
          })),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Hello');

    await svc.activate('fr');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Bonjour');
  });
});

describe('TPipe — placeholders + metadata', () => {
  it('interpolates values', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: { 'Hello, {name}': 'Hello, {name}' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithValues);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('Hello, Alice');
  });

  it('$context is stripped at runtime — it is an extraction-only hint', async () => {
    // $context is an extraction hint for the build-time PO catalog — at runtime
    // the pipe ignores it and looks up the bare msgid. This test asserts the
    // runtime behavior; the extraction behavior is tested in the extractor specs.
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: { Open: 'Open' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithContext);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Open');
  });
});
