import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { provideLingui } from './provide-lingui';

function configWithDetect(detected: string | null): LinguiConfig {
  return {
    sourceLocale: 'en',
    locales: ['en', 'fr'],
    loader: vi.fn(async () => ({ messages: {} })),
    detectLocale: vi.fn(() => detected),
  };
}

describe('provideLingui()', () => {
  it('calls detectLocale once at bootstrap and activates the result', async () => {
    const cfg = configWithDetect('fr');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(cfg)],
    });
    const svc = TestBed.inject(LinguiService);

    await TestBed.runInInjectionContext(async () => {});
    // detectLocale runs in service ctor; activate is async, so wait a microtask
    await new Promise((r) => setTimeout(r, 0));

    expect(cfg.detectLocale).toHaveBeenCalledOnce();
    expect(svc.locale()).toBe('fr');
  });

  it('falls back to sourceLocale when detectLocale returns null', async () => {
    const cfg = configWithDetect(null);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideLingui(cfg)],
    });
    const svc = TestBed.inject(LinguiService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.locale()).toBe('en');
  });

  it('yields independent service instances across injectors', () => {
    const cfgA = configWithDetect(null);
    const cfgB = configWithDetect(null);
    const beds = [
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideLingui(cfgA)],
      }).inject(LinguiService),
    ];
    TestBed.resetTestingModule();
    beds.push(
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideLingui(cfgB)],
      }).inject(LinguiService),
    );
    expect(beds[0]).not.toBe(beds[1]);
  });
});
