import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { LinguiService } from '../lingui.service';
import { provideLingui } from '../provide-lingui';
import { TPluralPipe } from './t-plural.pipe';

@Component({
  standalone: true,
  imports: [TPluralPipe],
  template: `<span data-test>{{ count | tPlural: { one: '# item', other: '# items' } }}</span>`,
})
class HostComponent {
  count = 0;
}

describe('TPluralPipe', () => {
  it('selects the one form for count=1', async () => {
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
    fixture.componentInstance.count = 1;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('1 item');
  });

  it('selects other and substitutes #', async () => {
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
    fixture.componentInstance.count = 3;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-test]')).nativeElement.textContent)
      .toBe('3 items');
  });

  it('throws at construction when "other" is missing', () => {
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
    const pipe = TestBed.runInInjectionContext(() => new TPluralPipe());
    // @ts-expect-error: deliberately bad shape to verify the runtime guard
    expect(() => pipe.transform(1, { one: '# item' })).toThrow(/other/);
  });
});
