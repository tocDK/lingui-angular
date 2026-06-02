import { Injector, TransferState, effect, makeStateKey, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LinguiUnknownLocaleError } from './errors';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { provideLingui } from './provide-lingui';
import { LINGUI_SSR_KEY } from './ssr/tokens';

function buildConfig(overrides: Partial<LinguiConfig> = {}): LinguiConfig {
  return {
    sourceLocale: 'en',
    locales: ['en', 'fr'],
    loader: vi.fn(async (locale: string) => ({
      messages: { hello: locale === 'fr' ? 'Bonjour' : 'Hello' },
    })),
    ...overrides,
  };
}

describe('LinguiService.activate()', () => {
  it('loads the catalog and flips the locale signal', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    expect(svc.locale()).toBe('en');
    const result = await svc.activate('fr');
    expect(result).toBe('fr');
    expect(svc.locale()).toBe('fr');
    expect(config.loader).toHaveBeenCalledOnce();
    expect(config.loader).toHaveBeenCalledWith('fr');
  });
});

describe('LinguiService concurrent activate()', () => {
  it('serializes concurrent activate() calls — last call wins', async () => {
    let resolveFr!: (c: { messages: Record<string, string> }) => void;
    let resolveDe!: (c: { messages: Record<string, string> }) => void;
    const loader = vi.fn((locale: string) => {
      if (locale === 'fr') return new Promise<{ messages: Record<string, string> }>((r) => { resolveFr = r; });
      if (locale === 'de') return new Promise<{ messages: Record<string, string> }>((r) => { resolveDe = r; });
      return Promise.resolve({ messages: {} });
    });
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({ sourceLocale: 'en', locales: ['en', 'fr', 'de'], loader }),
      ],
    });
    const svc = TestBed.inject(LinguiService);

    const frPromise = svc.activate('fr');
    const dePromise = svc.activate('de');

    // de resolves first
    resolveDe({ messages: {} });
    await dePromise;
    expect(svc.locale()).toBe('de');

    // fr resolves later but should NOT win
    resolveFr({ messages: {} });
    await frPromise;
    expect(svc.locale()).toBe('de');
    expect(svc.loading()).toBe(false);
  });
});

describe('LinguiService catalog caching', () => {
  it('does not call loader twice for the same locale', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    await svc.activate('fr');
    await svc.activate('fr');
    expect(config.loader).toHaveBeenCalledTimes(1);
  });
});

describe('LinguiService.loading', () => {
  it('toggles false → true → false around activate()', async () => {
    let resolveLoader!: (c: { messages: Record<string, string> }) => void;
    const config = buildConfig({
      loader: () => new Promise((res) => { resolveLoader = res; }),
    });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    expect(svc.loading()).toBe(false);
    const p = svc.activate('fr');
    expect(svc.loading()).toBe(true);
    resolveLoader({ messages: {} });
    await p;
    expect(svc.loading()).toBe(false);
  });

  it('returns to false even when loader rejects', async () => {
    const config = buildConfig({ loader: () => Promise.reject(new Error('boom')) });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    await expect(svc.activate('fr')).rejects.toThrow('boom');
    expect(svc.loading()).toBe(false);
  });
});

describe('LinguiService unknown locales', () => {
  it('rejects with LinguiUnknownLocaleError when locale is not configured', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    await expect(svc.activate('zh')).rejects.toBeInstanceOf(LinguiUnknownLocaleError);
    expect(config.loader).not.toHaveBeenCalled();
  });
});

describe('LinguiService fallback locales', () => {
  it('resolves fr-CA → fr when fallback maps it', async () => {
    const config = buildConfig({
      locales: ['en', 'fr'],
      fallbackLocales: { 'fr-CA': 'fr', default: 'en' },
    });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);

    await svc.activate('fr-CA');
    expect(svc.locale()).toBe('fr');
    expect(config.loader).toHaveBeenCalledWith('fr');
  });
});

describe('LinguiService SSR hydration', () => {
  it('uses TransferState payload if present, skipping the loader', async () => {
    const loader = vi.fn();
    const state = new TransferState();
    const key = makeStateKey<{ locale: string; messages: Record<string, string> }>('lingui-catalog');
    state.set(key, { locale: 'fr', messages: { hello: 'Bonjour' } });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TransferState, useValue: state },
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader,
        }),
      ],
    });
    const svc = TestBed.inject(LinguiService);
    // Microtask for the constructor's async hydration path
    await new Promise((r) => setTimeout(r, 0));

    expect(svc.locale()).toBe('fr');
    expect(loader).not.toHaveBeenCalled();
  });
});

describe('LinguiService detectLocale() error handling', () => {
  it('does not crash bootstrap when detectLocale() throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: vi.fn(),
          detectLocale: () => { throw new Error('boom'); },
        }),
      ],
    });
    expect(() => TestBed.inject(LinguiService)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/detectLocale/), expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('LinguiService config validation', () => {
  it('throws if sourceLocale is not in locales[]', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({ sourceLocale: 'en', locales: ['fr', 'de'], loader: vi.fn() }),
      ],
    });
    expect(() => TestBed.inject(LinguiService)).toThrow(/sourceLocale.*must be in locales/);
  });
});

describe('LinguiService LINGUI_SSR_KEY override', () => {
  it('honors LINGUI_SSR_KEY override for the TransferState key', async () => {
    const customKey = 'my-app-i18n';
    const state = new TransferState();
    state.set(makeStateKey<{ locale: string; messages: Record<string, string> }>(customKey), { locale: 'fr', messages: { hello: 'Bonjour' } });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TransferState, useValue: state },
        { provide: LINGUI_SSR_KEY, useValue: customKey },
        provideLingui({ sourceLocale: 'en', locales: ['en', 'fr'], loader: vi.fn() }),
      ],
    });
    const svc = TestBed.inject(LinguiService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.locale()).toBe('fr');
  });
});

describe('LinguiService.t$()', () => {
  it('re-emits when locale changes', async () => {
    const config = buildConfig();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(config)],
    });
    const svc = TestBed.inject(LinguiService);
    const injector = TestBed.inject(Injector);
    const observed: string[] = [];

    const stop = runInInjectionContext(injector, () =>
      effect(() => observed.push(svc.t$('hello')())),
    );

    // initial pulls source-locale value before any catalog load
    TestBed.flushEffects();
    await svc.activate('fr');
    TestBed.flushEffects();

    expect(observed[observed.length - 1]).toBe('Bonjour');
    stop.destroy();
  });
});
