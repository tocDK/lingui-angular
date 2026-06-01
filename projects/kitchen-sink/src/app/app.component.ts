import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LocaleSwitcherComponent } from './shared/locale-switcher.component';
import { StatusBarComponent } from './shared/status-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, LocaleSwitcherComponent, StatusBarComponent],
  template: `
    <header>
      <h1>&commat;tocdk/lingui-angular kitchen sink</h1>
      <app-locale-switcher />
    </header>
    <main>
      <nav>
        <a routerLink="/basic">basics</a>
        <a routerLink="/params">params</a>
        <a routerLink="/plural">plural</a>
        <a routerLink="/select">select</a>
        <a routerLink="/context">context</a>
        <a routerLink="/explicit-id">explicit ids</a>
        <a routerLink="/lazy">lazy</a>
        <a routerLink="/ssr">ssr</a>
        <a routerLink="/cd">cd</a>
        <a routerLink="/missing">missing</a>
      </nav>
      <section><router-outlet /></section>
    </main>
    <app-status-bar />
  `,
})
export class AppComponent {}
