import { InjectionToken } from '@angular/core';
import type { Messages } from '@lingui/core';

/** Default `TransferState` key; can be overridden via `LinguiConfig.ssrTransferKey`. */
export const DEFAULT_SSR_TRANSFER_KEY = 'lingui-catalog';

/** Serialized payload shape used between server and client. */
export interface LinguiTransferPayload {
  locale: string;
  messages: Messages;
}

/** Optional override token consumers can provide for non-default keys. */
export const LINGUI_SSR_KEY = new InjectionToken<string>('LINGUI_SSR_KEY', {
  factory: () => DEFAULT_SSR_TRANSFER_KEY,
});
