import { Directive, ElementRef, Injector, OnInit, effect, inject, input, runInInjectionContext } from '@angular/core';
import { LinguiService } from '../lingui.service';

@Directive({ selector: '[t]', standalone: true })
export class TDirective implements OnInit {
  readonly t = input.required<string>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly lingui = inject(LinguiService);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Reading locale() registers the reactive dep so the effect re-runs on locale change.
        // Reading this.t() registers a dep on the signal input so the effect also re-runs
        // when the parent rebinds [t]="someVar" and someVar changes.
        this.lingui.locale();
        this.host.nativeElement.textContent = this.lingui.i18n._(this.t());
      });
    });
  }
}
