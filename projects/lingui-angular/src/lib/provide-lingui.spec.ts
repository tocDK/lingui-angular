import { EnvironmentInjector, createEnvironmentInjector, provideZonelessChangeDetection } from '@angular/core';
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

  it('yields independent service instances across simultaneously-live injectors', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const parent = TestBed.inject(EnvironmentInjector);
    const cfgA = configWithDetect(null);
    const cfgB = configWithDetect(null);
    const injA = createEnvironmentInjector([provideLingui(cfgA)], parent);
    const injB = createEnvironmentInjector([provideLingui(cfgB)], parent);

    const svcA = injA.get(LinguiService);
    const svcB = injB.get(LinguiService);

    expect(svcA).not.toBe(svcB);

    injA.destroy();
    injB.destroy();
  });
});
