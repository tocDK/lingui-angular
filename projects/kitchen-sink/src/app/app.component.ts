import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LocaleSwitcherComponent } from './shared/locale-switcher.component';
import { StatusBarComponent } from './shared/status-bar.component';
import { ThemeToggleComponent } from './shared/theme-toggle.component';
import { NAV_SECTIONS } from './shared/app-nav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    LocaleSwitcherComponent,
    StatusBarComponent,
    ThemeToggleComponent,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav
        #sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()"
        class="app-sidenav"
      >
        <mat-nav-list>
          @for (section of navSections; track section.title) {
            <h3 matSubheader>{{ section.title }}</h3>
            @for (item of section.items; track item.path) {
              <a
                mat-list-item
                [routerLink]="item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="onNavClick(sidenav)"
                >{{ item.label }}</a
              >
            }
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="app-toolbar">
          @if (isHandset()) {
            <button
              mat-icon-button
              (click)="sidenav.toggle()"
              aria-label="Toggle menu"
            >
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="app-title">&commat;tocdk/lingui-angular kitchen sink</span>
          <span class="spacer"></span>
          <app-theme-toggle />
          <app-locale-switcher />
        </mat-toolbar>

        <main class="app-main">
          <router-outlet />
        </main>

        <mat-toolbar class="app-footer">
          <app-status-bar />
        </mat-toolbar>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .app-container {
        height: 100vh;
      }
      .app-sidenav {
        width: 240px;
      }
      .app-sidenav .active {
        background: var(--mat-sys-secondary-container);
      }
      .app-toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        gap: 0.5rem;
      }
      .app-toolbar .app-title {
        font-size: 1rem;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .app-main {
        padding: 1rem;
        min-height: calc(100vh - 64px - 48px);
      }
      .app-footer {
        min-height: 48px;
        height: 48px;
        padding: 0 1rem;
      }
    `,
  ],
})
export class AppComponent {
  private readonly observer = inject(BreakpointObserver);
  protected readonly navSections = NAV_SECTIONS;
  protected readonly isHandset = toSignal(
    this.observer.observe('(max-width: 959.98px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected onNavClick(sidenav: MatSidenav): void {
    if (this.isHandset()) void sidenav.close();
  }
}
