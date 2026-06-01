import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
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
