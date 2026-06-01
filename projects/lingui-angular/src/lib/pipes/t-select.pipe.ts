import { Pipe, PipeTransform, inject } from '@angular/core';
import { LinguiService } from '../lingui.service';

export type SelectRules = Record<string, string> & { other: string };

@Pipe({ name: 'tSelect', standalone: true, pure: false })
export class TSelectPipe implements PipeTransform {
  private readonly lingui = inject(LinguiService, { optional: true });

  transform(value: string, rules: SelectRules): string {
    if (!rules || typeof rules.other !== 'string') {
      throw new TypeError('tSelect requires an "other" rule.');
    }
    // Read locale to register reactive dep so the pipe re-runs on locale change
    this.lingui?.locale();
    const match = Object.prototype.hasOwnProperty.call(rules, value) ? rules[value] : undefined;
    return match ?? rules.other;
  }
}
