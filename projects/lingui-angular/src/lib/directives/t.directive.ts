import { Directive, ElementRef, Input, Injector, OnInit, effect, inject, runInInjectionContext } from '@angular/core';
import { LinguiService } from '../lingui.service';

@Directive({ selector: '[t]', standalone: true })
export class TDirective implements OnInit {
  @Input({ required: true }) t!: string;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly lingui = inject(LinguiService);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Reading locale() registers the reactive dep so the effect re-runs on locale change.
        this.lingui.locale();
        this.host.nativeElement.textContent = this.lingui.i18n._(this.t);
      });
    });
  }
}
