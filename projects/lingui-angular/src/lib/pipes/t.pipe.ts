import { Pipe, PipeTransform, inject } from '@angular/core';
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
      return this.lingui.i18n._(message);
    }

    const { $context, $id, ...values } = options;
    return this.lingui.i18n._(
      { id: $id ?? message, message, context: $context, values },
    );
  }
}
