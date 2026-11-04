'use client';

import { useMemo, useState } from 'react';
import { TITRE_ESPACE } from '@/components/patient/fiches-assiette/textesFiches';
import { TITRE_BIBLIOTHEQUE } from '@/components/patient/bibliotheque/textesBibliotheque';
import { TITRE_LETTRE } from '@/components/patient/lettre-adressage/textesLettre';
import { TITRE_COURRIER_COMPLEMENT } from '@/components/patient/courrier-complement/textesCourrierComplement';
import { TITRE_DOCUMENT_MEDECIN } from '@/components/patient/document-medecin/textesDocumentMedecin';
import { LIEN_DEPOT } from '@/components/patient/collecte/textesDepot';
import { LIEN_MES_ECHANGES } from '@/components/patient/mes-echanges/textesMesEchanges';

/*
 * LA LISTE DES ENTRÉES DE « AUTRES ESPACES », DÉCLARÉE UNE FOIS.
 *
 * Posée par le lot L1 de l'audit « rails et menus » (docs/claude/propositions/
 * 2026-11-01-portail-rails-et-menus/, chapitre 11 ; EP-04, EP-17, EP-18),
 * rendue par le lot L2 : le hub affiche l'ancre « Mon parcours » puis les
 * quatre groupes de [[D-423]] §2, dans l'ordre de CE tableau, qui est celui de
 * la décision. Aucune autre liste n'est écrite à la main.
 *
 * Module patient séparé (Q14) : hors `lib/portail` (périmètre auth), sans lien
 * avec `SidebarRail`, `NavBar` ni `MobileBottomNav`. Aucune URL de sonde ici :
 * chaque `Lien*` garde la sienne, fail-closed.
 */

export type GroupeAutresEspaces = 'au_jour_le_jour' | 'recu' | 'transmis' | 'avec_mon_praticien';

/** Noms de groupes acceptés mot pour mot (D-423 §3), dans l'ordre de D-423 §2. */
export const GROUPES_AUTRES_ESPACES: readonly { id: GroupeAutresEspaces; libelle: string }[] = [
  { id: 'au_jour_le_jour', libelle: 'Au jour le jour' },
  { id: 'recu', libelle: 'Ce que j’ai reçu' },
  { id: 'transmis', libelle: 'Ce que je transmets' },
  { id: 'avec_mon_praticien', libelle: 'Avec mon praticien' },
];

/** Les dix entrées dont un composant `Lien*` sonde la route. */
export type CleSonde =
  | 'fiches'
  | 'bibliotheque'
  | 'courrierMedecin'
  | 'courrierComplement'
  | 'pourVotreMedecin'
  | 'compteRendu'
  | 'depot'
  | 'renseignements'
  | 'echanges'
  | 'dossier';

export type CleEntree = CleSonde | 'bilan' | 'carnet' | 'suivi';

/**
 * Ce qui fait paraître l'entrée :
 * - `aucune` : lien écrit sans condition (carnet, suivi : « une porte qui
 *   s'explique », LOT-05) ;
 * - `bilanConsultable` : signal servi par `api/portail/assignations` ;
 * - `sonde` : la route du composant `Lien*` a répondu « ouvert ».
 */
export type ConditionEntree = 'aucune' | 'bilanConsultable' | 'sonde';

export type EntreeAutresEspaces = {
  cle: CleEntree;
  libelle: string;
  /** Segment sous `/portail/[token]/` ; un banc exige son `page.tsx`. */
  segment: string;
  groupe: GroupeAutresEspaces;
  condition: ConditionEntree;
};

/** Ordre de [[D-423]] §2 : groupe par groupe, les entrées dans l'ordre écrit. */
export const ENTREES_AUTRES_ESPACES: readonly EntreeAutresEspaces[] = [
  { cle: 'suivi', libelle: 'Ouvrir mes rendez-vous de suivi', segment: 'suivi', groupe: 'au_jour_le_jour', condition: 'aucune' },
  { cle: 'carnet', libelle: 'Ouvrir Mon carnet alimentaire', segment: 'alimentation', groupe: 'au_jour_le_jour', condition: 'aucune' },
  { cle: 'bilan', libelle: 'Consulter mon bilan', segment: 'bilan', groupe: 'recu', condition: 'bilanConsultable' },
  { cle: 'bibliotheque', libelle: TITRE_BIBLIOTHEQUE, segment: 'bibliotheque', groupe: 'recu', condition: 'sonde' },
  { cle: 'fiches', libelle: TITRE_ESPACE, segment: 'fiches', groupe: 'recu', condition: 'sonde' },
  { cle: 'courrierMedecin', libelle: TITRE_LETTRE, segment: 'courrier-medecin', groupe: 'recu', condition: 'sonde' },
  { cle: 'courrierComplement', libelle: TITRE_COURRIER_COMPLEMENT, segment: 'courrier-complement', groupe: 'recu', condition: 'sonde' },
  { cle: 'pourVotreMedecin', libelle: TITRE_DOCUMENT_MEDECIN, segment: 'pour-votre-medecin', groupe: 'recu', condition: 'sonde' },
  { cle: 'renseignements', libelle: 'Ma fiche de renseignements', segment: 'renseignements', groupe: 'transmis', condition: 'sonde' },
  { cle: 'compteRendu', libelle: 'Transmettre un compte rendu d’analyses', segment: 'comptes-rendus', groupe: 'transmis', condition: 'sonde' },
  { cle: 'depot', libelle: LIEN_DEPOT, segment: 'documents', groupe: 'transmis', condition: 'sonde' },
  { cle: 'dossier', libelle: 'Ouvrir mon dossier à deux voix', segment: 'dossier', groupe: 'avec_mon_praticien', condition: 'sonde' },
  { cle: 'echanges', libelle: LIEN_MES_ECHANGES, segment: 'echanges', groupe: 'avec_mon_praticien', condition: 'sonde' },
];

export function hrefEntree(token: string, entree: Pick<EntreeAutresEspaces, 'segment'>): string {
  return `/portail/${token}/${entree.segment}`;
}

/** Réponse de chaque sonde ; absente = pas encore répondu, donc fermée. */
export type EtatsSondes = Partial<Record<CleSonde, boolean>>;

/**
 * Les entrées servies, dans l'ordre de la liste. Aucune règle n'est ajoutée :
 * l'exclusion fiches / bibliothèque (D-360 §2) reste celle des routes, qui
 * ferment la sonde des fiches quand la bibliothèque est servie.
 */
export function entreesServies(etats: EtatsSondes, signaux: { bilanConsultable: boolean }): EntreeAutresEspaces[] {
  return ENTREES_AUTRES_ESPACES.filter(entree => {
    if (entree.condition === 'aucune') return true;
    if (entree.condition === 'bilanConsultable') return signaux.bilanConsultable;
    return etats[entree.cle as CleSonde] === true;
  });
}

/**
 * Les groupes servis, dans l'ordre de [[D-423]] §2. Un groupe sans entrée
 * ouverte n'est pas rendu, et n'a donc pas d'étiquette (§2, Q10).
 */
export function groupesServis(
  etats: EtatsSondes,
  signaux: { bilanConsultable: boolean },
): { id: GroupeAutresEspaces; libelle: string; entrees: EntreeAutresEspaces[] }[] {
  const servies = entreesServies(etats, signaux);
  return GROUPES_AUTRES_ESPACES.map(groupe => ({
    ...groupe,
    entrees: servies.filter(entree => entree.groupe === groupe.id),
  })).filter(groupe => groupe.entrees.length > 0);
}

/**
 * Collecte l'état des dix sondes par la prop de rappel `onSonde` des `Lien*`.
 * Les rappels sont stables : un `Lien*` lit le sien au montage seulement.
 */
export function useEtatsSondes(): {
  etats: EtatsSondes;
  rapporteurs: Record<CleSonde, (ouvert: boolean) => void>;
} {
  const [etats, setEtats] = useState<EtatsSondes>({});
  const rapporteurs = useMemo(() => {
    const rapporter = (cle: CleSonde) => (ouvert: boolean) =>
      setEtats(precedent => (precedent[cle] === ouvert ? precedent : { ...precedent, [cle]: ouvert }));
    return {
      fiches: rapporter('fiches'),
      bibliotheque: rapporter('bibliotheque'),
      courrierMedecin: rapporter('courrierMedecin'),
      courrierComplement: rapporter('courrierComplement'),
      pourVotreMedecin: rapporter('pourVotreMedecin'),
      compteRendu: rapporter('compteRendu'),
      depot: rapporter('depot'),
      renseignements: rapporter('renseignements'),
      echanges: rapporter('echanges'),
      dossier: rapporter('dossier'),
    };
  }, []);
  return { etats, rapporteurs };
}
