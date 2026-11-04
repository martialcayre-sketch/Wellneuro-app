'use client';

import { createContext, useContext } from 'react';
import { LienDossierDeuxVoix } from '@/components/patient-companion/LienDossierDeuxVoix';
import { LienFichesRemises } from '@/components/patient-companion/LienFichesRemises';
import { LienBibliotheque } from '@/components/patient-companion/LienBibliotheque';
import { LienCourrierMedecin } from '@/components/patient-companion/LienCourrierMedecin';
import { LienCourrierComplement } from '@/components/patient-companion/LienCourrierComplement';
import { LienPourVotreMedecin } from '@/components/patient-companion/LienPourVotreMedecin';
import { LienTransmissionCompteRendu } from '@/components/patient-companion/LienTransmissionCompteRendu';
import { LienMesEchanges } from '@/components/patient-companion/LienMesEchanges';
import { LienDepotDocuments } from '@/components/patient-companion/LienDepotDocuments';
import { LienFicheRenseignements } from '@/components/physio-traitements/LienFicheRenseignements';
import type { CleSonde, EtatsSondes } from './entreesAutresEspaces';

/*
 * LES DIX SONDES DES ESPACES, MONTÉES UNE FOIS.
 *
 * Chaque `Lien*` garde sa route, fail-closed, et rapporte « ouvert » ou non
 * sans rendre de lien (`sondeSeule`). Le bloc « Autres espaces » du hub les
 * montait seul (lot L2) ; le menu « Mon espace » ([[D-442]] §2) les monte au
 * layout et partage leurs réponses par `SondesPartageesContexte`, pour que le
 * hub ne les relance pas : aucune requête doublée.
 */
export function SondesAutresEspaces({
  token,
  rapporteurs,
}: {
  token: string;
  rapporteurs: Record<CleSonde, (ouvert: boolean) => void>;
}) {
  return (
    <>
      <LienFichesRemises token={token} onSonde={rapporteurs.fiches} sondeSeule />
      <LienBibliotheque token={token} onSonde={rapporteurs.bibliotheque} sondeSeule />
      <LienCourrierMedecin token={token} onSonde={rapporteurs.courrierMedecin} sondeSeule />
      <LienCourrierComplement token={token} onSonde={rapporteurs.courrierComplement} sondeSeule />
      <LienPourVotreMedecin token={token} onSonde={rapporteurs.pourVotreMedecin} sondeSeule />
      <LienTransmissionCompteRendu token={token} onSonde={rapporteurs.compteRendu} sondeSeule />
      <LienDepotDocuments token={token} onSonde={rapporteurs.depot} sondeSeule />
      <LienFicheRenseignements token={token} onSonde={rapporteurs.renseignements} sondeSeule />
      <LienMesEchanges token={token} onSonde={rapporteurs.echanges} sondeSeule />
      <LienDossierDeuxVoix token={token} onSonde={rapporteurs.dossier} sondeSeule />
    </>
  );
}

/** Réponses des sondes montées par le menu ; `null` = le menu ne les monte pas. */
export const SondesPartageesContexte = createContext<EtatsSondes | null>(null);

export function useSondesPartagees(): EtatsSondes | null {
  return useContext(SondesPartageesContexte);
}
