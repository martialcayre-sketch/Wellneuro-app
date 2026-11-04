import type { ReactNode } from 'react';
import { FournisseurFriseNavigable } from '@/components/patient/frise/FriseEtapesNavigable';
import { friseNavigableOuverte } from '@/components/patient/frise/friseDrapeau';

// Le hub est un composant client : `WN_PORTAIL_FRISE_NAVIGABLE` n'est pas
// `NEXT_PUBLIC_*` et n'atteint pas le navigateur. Ce layout la lit côté
// serveur, à chaque requête (`portail/layout.tsx` rend tout `/portail/*`
// dynamique), et la sert par contexte ([[D-423]] §7 et §8). Il ne lit ni
// session ni base, et ne décide d'aucun accès : il choisit une frise.
export default function QuestionnairesLayout({ children }: { children: ReactNode }) {
  return <FournisseurFriseNavigable ouverte={friseNavigableOuverte()}>{children}</FournisseurFriseNavigable>;
}
