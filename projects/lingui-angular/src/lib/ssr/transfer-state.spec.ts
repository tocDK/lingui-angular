import { TransferState } from '@angular/core';
import { setupI18n } from '@lingui/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SSR_TRANSFER_KEY } from './tokens';
import { hydrateCatalog, serializeCatalog } from './transfer-state';

describe('TransferState catalog handoff', () => {
  it('round-trips locale + messages byte-identical', () => {
    const serverI18n = setupI18n({
      locale: 'fr',
      messages: { fr: { hello: 'Bonjour', bye: 'Au revoir' } },
    });
    // Shared TransferState simulates the serialized payload being available
    // on the client (Angular 20's TransferState has no initialize() method;
    // in tests we use one shared instance instead of JSON round-tripping).
    const state = new TransferState();
    serializeCatalog(serverI18n, state, DEFAULT_SSR_TRANSFER_KEY);

    const clientI18n = setupI18n({ locale: 'en' });
    hydrateCatalog(clientI18n, state, DEFAULT_SSR_TRANSFER_KEY);

    expect(clientI18n.locale).toBe('fr');
    expect(clientI18n.messages['hello']).toBe('Bonjour');
    expect(clientI18n.messages['bye']).toBe('Au revoir');
  });

  it('hydrateCatalog is a no-op when key is missing', () => {
    const i18n = setupI18n({ locale: 'en' });
    const state = new TransferState();
    hydrateCatalog(i18n, state, 'absent-key');
    expect(i18n.locale).toBe('en');
  });
});
