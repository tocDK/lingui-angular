import { Pipe, PipeTransform, inject } from '@angular/core';
import { formats } from '@lingui/core';
import { LinguiService } from '../lingui.service';

export type PluralRules = Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many', string>> & {
  other: string;
};

@Pipe({ name: 'tPlural', standalone: true, pure: false })
export class TPluralPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService, { optional: true });

  transform(count: number, rules: PluralRules): string {
    if (!rules || typeof rules.other !== 'string') {
      throw new TypeError('tPlural requires an "other" rule.');
    }

    const locale = this.lingui?.locale() ?? 'en';
    // Cast needed: @lingui/core's PluralOptions types values as LDMLPluralRule but
    // they are actually the translated strings (e.g. '# item').
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const form: string = formats.plural([locale], false, count, rules as any);
    return form.replace(/#/g, String(count));
  }
}
