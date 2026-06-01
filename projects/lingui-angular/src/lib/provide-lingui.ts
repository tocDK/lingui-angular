import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { LinguiConfig } from './lingui-config';

export const LINGUI_CONFIG = new InjectionToken<LinguiConfig>('LINGUI_CONFIG');

export function provideLingui(config: LinguiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: LINGUI_CONFIG, useValue: config }]);
}
