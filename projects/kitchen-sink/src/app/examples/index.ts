import { Type } from '@angular/core';
import { BasicExample } from './basic.example';
import { ParamsExample } from './params.example';
import { PluralExample } from './plural.example';
import { SelectExample } from './select.example';
import { ContextExample } from './context.example';
import { ExplicitIdExample } from './explicit-id.example';
import { LazyExample } from './lazy.example';
import { SsrExample } from './ssr.example';
import { CdExample } from './cd.example';
import { MissingExample } from './missing.example';

export const EXAMPLE_COMPONENTS: Record<string, Type<unknown>> = {
  basic: BasicExample,
  params: ParamsExample,
  plural: PluralExample,
  select: SelectExample,
  context: ContextExample,
  'explicit-id': ExplicitIdExample,
  lazy: LazyExample,
  ssr: SsrExample,
  cd: CdExample,
  missing: MissingExample,
};
