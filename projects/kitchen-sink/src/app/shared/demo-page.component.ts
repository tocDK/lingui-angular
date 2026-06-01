import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-demo-page',
  standalone: true,
  template: `
    <h2>{{ title }}</h2>
    <section><ng-content select="[rendered]" /></section>
    <pre><ng-content select="[source]" /></pre>
  `,
})
export class DemoPageComponent {
  @Input({ required: true }) title!: string;
}
