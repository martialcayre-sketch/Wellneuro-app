'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Position de `WN_AGENDA_ALI` portée jusqu'au panneau praticien, depuis le
// composant SERVEUR qui monte la fiche. Même motif que `C5FeatureProvider`
// (`components/patient-cockpit/C5FeatureProvider.tsx`) pour `WN_C5_ENABLED`.
// Voir D-028 : le drapeau n'arrive PAS par la réponse de la route
// `GET /api/praticien/agenda-alimentaire`, dont un commentaire interdit d'y
// appeler `isAgendaAlimentaireEnabled` sans rouvrir D-027.
//
// ── POURQUOI TROIS ÉTATS, ET PAS `false` PAR DÉFAUT ─────────────────────────
// Le réflexe fail-closed vient des GARDES : refuser par défaut ne coûte qu'un
// accès, et c'est la bonne doctrine pour `isAgendaAlimentaireEnabled` lui-même.
// Ce contexte-ci ne garde rien : il alimente un ÉNONCÉ — « Recueil fermé, le
// patient ne peut plus noter de journée ». Or le drapeau est ALLUMÉ en
// production (D-025) : un défaut `false` serait donc la valeur fausse cent
// pour cent du temps, et un fil débranché (provider oublié sur un futur point
// de montage, faute de frappe sur le nom de la variable) afficherait en
// silence une affirmation fausse sur l'état d'un dossier.
//
// `null` = « position inconnue ». Le panneau n'affirme alors RIEN : ni ouvert,
// ni fermé. Se taire quand on ne sait pas est le seul défaut qui ne ment
// jamais — et le câblage réel, lui, est épinglé par un test
// (`web/src/app/dashboard/patients/[idPatient]/page.test.tsx`) plutôt que
// laissé à un défaut qui compenserait sa rupture.
const AgendaAliEnabledContext = createContext<boolean | null>(null);

export function AgendaAliFeatureProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AgendaAliEnabledContext.Provider value={enabled}>{children}</AgendaAliEnabledContext.Provider>;
}

/** `true` ouvert, `false` fermé, `null` position inconnue — jamais aplati. */
export function useAgendaAliEnabled(): boolean | null {
  return useContext(AgendaAliEnabledContext);
}
