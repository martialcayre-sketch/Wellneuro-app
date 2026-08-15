'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Drapeau CB (biologie, LOT-06) — même patron que C5FeatureProvider : la
// valeur est lue côté serveur (`isCbEnabled(process.env.WN_CB_ENABLED)`) et
// injectée ici ; le client ne lit jamais l'environnement lui-même.
const CbEnabledContext = createContext(false);

export function CbFeatureProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <CbEnabledContext.Provider value={enabled}>{children}</CbEnabledContext.Provider>;
}

export function useCbEnabled(): boolean {
  return useContext(CbEnabledContext);
}
