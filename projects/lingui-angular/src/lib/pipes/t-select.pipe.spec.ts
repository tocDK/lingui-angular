import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TSelectPipe } from './t-select.pipe';

@Component({
  standalone: true,
  imports: [TSelectPipe],
  template: `<span data-test>{{ status | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</span>`,
})
class HostComponent {
  status = 'active';
}

describe('TSelectPipe', () => {
  it('matches by key', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Online');
  });

  it('falls through to "other" for unmatched values', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    await TestBed.inject(LinguiService).activate('en');
    fixture.componentInstance.status = 'unknown';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent).toBe('Offline');
  });

  it('throws when "other" is missing', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: {} }),
        }),
      ],
    });
    // Must create pipe inside injection context to avoid NG0203
    const pipe = TestBed.runInInjectionContext(() => new TSelectPipe());
    // @ts-expect-error: deliberately bad
    expect(() => pipe.transform('active', { active: 'On' })).toThrow(/other/);
  });
});
