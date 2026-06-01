import { TransferState, makeStateKey } from '@angular/core';
import type { I18n } from '@lingui/core';
import type { LinguiTransferPayload } from './tokens';

/** Server-side: writes the active catalog into TransferState under `key`. */
export function serializeCatalog(i18n: I18n, state: TransferState, key: string): void {
  const stateKey = makeStateKey<LinguiTransferPayload>(key);
  state.set(stateKey, {
    locale: i18n.locale,
    messages: i18n.messages as Record<string, string>,
  });
}

/** Client-side: if TransferState contains a catalog under `key`, hydrate i18n with it.
 *  Returns true if hydration was applied, false if the key was absent. */
export function hydrateCatalog(i18n: I18n, state: TransferState, key: string): boolean {
  const stateKey = makeStateKey<LinguiTransferPayload>(key);
  if (!state.hasKey(stateKey)) return false;
  const payload = state.get(stateKey, null as unknown as LinguiTransferPayload);
  if (!payload) return false;
  i18n.load(payload.locale, payload.messages);
  i18n.activate(payload.locale);
  return true;
}
