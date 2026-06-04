import { Component as Cmp, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
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

@Cmp({
  standalone: true,
  imports: [TPipe],
  template: `<span data-test>{{ 'Log in to your account' | t }}</span>`,
})
class HostHashedCatalog {}

describe('TPipe — plain', () => {
  it('returns translated text from a source-keyed (hand-forged) catalog — back-compat', async () => {
    // Back-compat path: hand-forged catalogs key entries by source text. The
    // runtime hashes the lookup id but falls back to a source-text lookup if
    // the hash doesn't hit.
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

  it('looks up by hashed id (real `lingui compile --typescript` output shape)', async () => {
    // The shape Lingui CLI actually produces for bare-string msgids.
    const source = 'Log in to your account';
    const hash = generateMessageId(source);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'da'],
          loader: vi.fn(async (l: string) => ({
            messages: { [hash]: l === 'da' ? 'Log ind på din konto' : source },
          })),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostHashedCatalog);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe(source);

    await svc.activate('da');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Log ind på din konto');
  });
});

describe('TPipe — placeholders + metadata', () => {
  it('interpolates values (parameterized messages stay source-keyed in `lingui compile`)', async () => {
    // Parameterized messages are NOT hashed by `lingui compile --typescript` —
    // they remain source-keyed. The two-stage lookup picks them up via the
    // back-compat path.
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

  it('$context is factored into the hashed lookup id (matches `lingui compile` contract)', async () => {
    // $context is part of the hash input — `generateMessageId(msg, context)` —
    // so the runtime id matches what `lingui compile --typescript` produced
    // for the same `$context` extraction hint.
    const hash = generateMessageId('Open', 'verb');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'da'],
          loader: async (l) => ({ messages: { [hash]: l === 'da' ? 'Åbn' : 'Open' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithContext);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Open');

    await svc.activate('da');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Åbn');
  });
});
