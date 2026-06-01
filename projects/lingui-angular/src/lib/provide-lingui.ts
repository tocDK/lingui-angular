import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import type { LinguiConfig } from './lingui-config';
import { LinguiService } from './lingui.service';
import { LINGUI_CONFIG } from './tokens';

export { LINGUI_CONFIG } from './tokens';

export function provideLingui(config: LinguiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: LINGUI_CONFIG, useValue: config },
    LinguiService,
  ]);
}
