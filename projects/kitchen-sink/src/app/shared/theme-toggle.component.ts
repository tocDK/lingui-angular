import {
  Component,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'kitchen-sink:theme';

function readInitialMode(isBrowser: boolean): ThemeMode {
  if (!isBrowser) return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="
        mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      "
      (click)="toggle()"
    >
      <mat-icon>{{ mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly mode = signal<ThemeMode>(readInitialMode(this.isBrowser));

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      const current = this.mode();
      document.documentElement.classList.toggle(
        'dark-theme',
        current === 'dark',
      );
      try {
        localStorage.setItem(STORAGE_KEY, current);
      } catch {
        /* ignore */
      }
    });
  }

  protected toggle(): void {
    this.mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }
}
