import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

describe('TDirective', () => {
  it('writes translated text into the host element textContent', async () => {
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
});
