import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { generateMessageId } from '@lingui/message-utils/generateMessageId';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TDirective } from './t.directive';

@Component({
  standalone: true,
  imports: [TDirective],
  template: `<button [t]="'Cancel'" data-test></button>`,
})
class HostComponent {}

@Component({
  standalone: true,
  imports: [TDirective],
  template: `<button [t]="key()" data-test></button>`,
})
class HostWithDynamicKey {
  readonly key = signal('Cancel');
}

@Component({
  standalone: true,
  imports: [TDirective],
  template: `<button [t]="'Log in to your account'" data-test></button>`,
})
class HostHashedCatalog {}

describe('TDirective', () => {
  it('writes translated text into the host element textContent (source-keyed back-compat)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'fr'],
          loader: async (l) => ({
            messages: { Cancel: l === 'fr' ? 'Annuler' : 'Cancel' },
          }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe('Cancel');

    await svc.activate('fr');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe('Annuler');
  });

  it('re-renders when the [t] binding changes', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en'],
          loader: async () => ({ messages: { Cancel: 'Cancel', Confirm: 'Confirm' } }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostWithDynamicKey);
    await TestBed.inject(LinguiService).activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim()).toBe('Cancel');

    fixture.componentInstance.key.set('Confirm');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim()).toBe('Confirm');
  });

  it('looks up by hashed id (real `lingui compile --typescript` output shape)', async () => {
    const source = 'Log in to your account';
    const hash = generateMessageId(source);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLingui({
          sourceLocale: 'en',
          locales: ['en', 'da'],
          loader: async (l) => ({
            messages: { [hash]: l === 'da' ? 'Log ind på din konto' : source },
          }),
        }),
      ],
    });
    const fixture = TestBed.createComponent(HostHashedCatalog);
    const svc = TestBed.inject(LinguiService);
    await svc.activate('en');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe(source);

    await svc.activate('da');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent.trim())
      .toBe('Log ind på din konto');
  });
});
