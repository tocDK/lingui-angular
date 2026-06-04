import { Directive, ElementRef, Injector, OnInit, effect, inject, input, runInInjectionContext } from '@angular/core';
import { lookupBareString } from '../internal/lookup';
import { LinguiService } from '../lingui.service';

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[t]', standalone: true })
export class TDirective implements OnInit {
  readonly t = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly lingui = inject(LinguiService);
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Reading locale() registers the reactive dep so the effect re-runs on locale change.
        // Reading this.t() registers a dep on the signal input so the effect also re-runs
        // when the parent rebinds [t]="someVar" and someVar changes.
        this.lingui.locale();
        // Bare-string form: hash the source for lookup so we hit the catalog
        // shape `lingui compile --typescript` produces.
        this.host.nativeElement.textContent = lookupBareString(this.lingui.i18n, this.t());
      });
    });
  }
}
