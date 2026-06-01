import { Injector, TransferState, effect, makeStateKey, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LinguiUnknownLocaleError } from './errors';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { provideLingui } from './provide-lingui';

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
    await svc.activate('fr');
    expect(svc.locale()).toBe('fr');
    expect(config.loader).toHaveBeenCalledOnce();
    expect(config.loader).toHaveBeenCalledWith('fr');
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
