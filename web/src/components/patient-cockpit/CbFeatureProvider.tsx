'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Drapeau CB (biologie, LOT-06) — même patron que C5FeatureProvider : la
// valeur est lue côté serveur (`isCbEnabled(process.env.WN_CB_ENABLED)`) et
// injectée ici ; le client ne lit jamais l'environnement lui-même.
// Depuis l'étage 2 (CB-09, D-122 §2), le provider porte AUSSI le drapeau des
// résultats réels (`isCbResultsEnabled`) — même canal, même discipline :
// absent par défaut, donc éteint (fail-closed, D-081). Et depuis BIO-INGEST
// LOT-02, celui de l'import de comptes rendus (`isBioIngestEnabled`, qui
// exige déjà les deux autres). Et depuis BP-10, celui de l'acte de lecture
// d'un import validé (`isBioLectureEnabled`, [[D-268]], qui exige l'import).
const CbEnabledContext = createContext(false);
const CbResultsEnabledContext = createContext(false);
const BioIngestEnabledContext = createContext(false);
const BioLectureEnabledContext = createContext(false);

export function CbFeatureProvider({
  enabled,
  resultsEnabled = false,
  bioIngestEnabled = false,
  bioLectureEnabled = false,
  children,
}: {
  enabled: boolean;
  resultsEnabled?: boolean;
  bioIngestEnabled?: boolean;
  bioLectureEnabled?: boolean;
  children: ReactNode;
}) {
  return (
    <CbEnabledContext.Provider value={enabled}>
      <CbResultsEnabledContext.Provider value={resultsEnabled}>
        <BioIngestEnabledContext.Provider value={bioIngestEnabled}>
          <BioLectureEnabledContext.Provider value={bioLectureEnabled}>{children}</BioLectureEnabledContext.Provider>
        </BioIngestEnabledContext.Provider>
      </CbResultsEnabledContext.Provider>
    </CbEnabledContext.Provider>
  );
}

export function useCbEnabled(): boolean {
  return useContext(CbEnabledContext);
}

export function useCbResultsEnabled(): boolean {
  return useContext(CbResultsEnabledContext);
}

export function useBioIngestEnabled(): boolean {
  return useContext(BioIngestEnabledContext);
}

export function useBioLectureEnabled(): boolean {
  return useContext(BioLectureEnabledContext);
}
