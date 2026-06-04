import { Pipe, PipeTransform, inject } from '@angular/core';
import { lookupBareString } from '../internal/lookup';
import { LinguiService } from '../lingui.service';

export interface TPipeOptions {
  $context?: string;
  $id?: string;
  [placeholder: string]: unknown;
}

@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService);

  transform(message: string, options?: TPipeOptions): string {
    // Read the locale signal to register a reactive dep so pure-pipe CD
    // re-runs us on locale change.
    this.lingui.locale();

    if (!options) {
      // Bare-string form: hash the source for lookup so we hit the catalog
      // shape `lingui compile --typescript` produces.
      return lookupBareString(this.lingui.i18n, message);
    }

    const { $context, $id, ...values } = options;
    if ($id) {
      // Explicit id — caller has opted in (typically pre-hashed). Pass through.
      return this.lingui.i18n._($id, values, { message });
    }
    // No explicit id: hash the source (with $context per Lingui's contract) so
    // the runtime id matches `lingui compile --typescript` output. Parameterized
    // messages aren't hashed by Lingui CLI, but the two-stage lookup in
    // lookupBareString handles both shapes.
    return lookupBareString(this.lingui.i18n, message, values, $context);
  }
}
