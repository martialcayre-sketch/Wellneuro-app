import { getDocumentCourant } from './contenus/registre';
import type { StatutAge } from '@/lib/patient/gardeAge';
import type { TrustDocumentKey } from './types';

// LA SÉQUENCE « AVANT DE COMMENCER » ET SA PORTE, TENUES PAR LA MÊME LISTE.
//
// Jusqu'au 2026-09-16, `requiresAcknowledgement` était un champ MORT : déclaré
// au type, posé sur les treize documents du registre, asséré par un banc — et
// lu par AUCUN code. La porte du portail ne regardait qu'une chose, écrite en
// dur : la version courante de `cadre_accompagnement`. Un document qui
// réclamait un accusé ne le réclamait qu'en paroles.
//
// LE PIÈGE DE CE CÂBLAGE, ET LA RAISON DE CE MODULE. Si la porte EXIGE un
// accusé que la séquence n'ENREGISTRE pas, le patient boucle : il déroule les
// quatre écrans, valide, revient, et retrouve les quatre écrans. Deux listes
// recopiées à deux endroits auraient produit exactement cela à la première
// divergence. Il n'y en a donc qu'une, et les deux camps la lisent ici.
//
// CE QUE CETTE LISTE N'EST PAS : le registre entier. `usage_ia`,
// `droits_patient` et `consentement_suivi` en sont absents parce que la
// séquence NE LES PRÉSENTE PAS — y exiger un accusé demanderait au patient de
// reconnaître un texte qu'il n'a pas vu passer. Ajouter une clé ici oblige donc
// à ajouter un écran là-bas, et le banc `avantDeCommencer.test.ts` le dit.
export const DOCUMENTS_AVANT_DE_COMMENCER: readonly TrustDocumentKey[] = Object.freeze([
  'cadre_accompagnement',
  'limites_securite',
  'donnees_confidentialite',
]);

/** Forme minimale d'un accusé, telle que la base et la route la servent. */
export type AccuseConnu = {
  documentKey: string;
  documentVersion: string;
  type: string;
};

/**
 * Les documents dont la version COURANTE réclame un accusé.
 *
 * La version courante, et elle seule : un accusé posé sur `donnees_
 * confidentialite@v1` ne vaut pas pour la v8, et c'est tout l'intérêt du
 * versionnement. À l'inverse, une version qui ne réclame rien (les v3 à v7,
 * qui décrivaient sans rien recueillir de neuf) sort de cette liste toute
 * seule — sans qu'on ait à retirer sa clé.
 */
export function documentsRequerantAccuse(): TrustDocumentKey[] {
  return DOCUMENTS_AVANT_DE_COMMENCER.filter(cle => getDocumentCourant(cle).requiresAcknowledgement);
}

/**
 * La séquence doit-elle être présentée ?
 *
 * Oui dès qu'UN document requérant un accusé n'en a pas un, de type
 * `pris_connaissance`, sur sa version courante. `presente` ne compte pas : il
 * trace qu'un texte a été affiché, jamais qu'il a été reconnu.
 */
export function avantDeCommencerRequis(accuses: readonly AccuseConnu[]): boolean {
  return documentsRequerantAccuse().some(cle => {
    const courant = getDocumentCourant(cle);
    return !accuses.some(
      a =>
        a.documentKey === cle &&
        a.documentVersion === courant.version &&
        a.type === 'pris_connaissance',
    );
  });
}

// L'ACCUEIL SOUS LES CONDITIONS D'UTILISATION ([[D-292]] §3, ACT-1).
//
// Un accusé `pris_connaissance` sur l'un de ces textes, quelle qu'en soit la
// version, fait du patient un patient SUIVI : aucun mur dans le portail, ni à
// ACT-1 ni à une version suivante — il accuse par le lien de l'e-mail ou au
// filet du dépôt. `usage_ia` en est : il ne s'accuse qu'au dépôt, après
// l'accueil.
const TEXTES_D_INFORMATION: readonly string[] = Object.freeze([
  'cadre_accompagnement',
  'limites_securite',
  'donnees_confidentialite',
  'usage_ia',
  'conditions_utilisation',
]);

/** Patient suivi : un accusé `pris_connaissance` sur un texte d'information, toute version. */
export function estPatientSuivi(accuses: readonly AccuseConnu[]): boolean {
  return accuses.some(a => a.type === 'pris_connaissance' && TEXTES_D_INFORMATION.includes(a.documentKey));
}

/** L'accueil à présenter : la séquence en trois textes, les conditions seules, ou rien. */
export type Accueil = 'trois_textes' | 'conditions' | null;

/**
 * Drapeau fermé, ou dossier mineur ou sans date de naissance (arbitrage du
 * 2026-10-16) : la porte d'avant, inchangée. Drapeau ouvert sur un dossier
 * majeur : les conditions seules au patient qui n'a accusé aucun texte
 * d'information, rien aux autres. L'accueil des conditions pose leur accusé,
 * qui fait du patient un patient suivi : il se termine.
 */
export function accueilRequis(
  accuses: readonly AccuseConnu[],
  contexte: { conditionsOuvertes: boolean; statutAge: StatutAge },
): Accueil {
  if (!contexte.conditionsOuvertes || contexte.statutAge !== 'majeur') {
    return avantDeCommencerRequis(accuses) ? 'trois_textes' : null;
  }
  return estPatientSuivi(accuses) ? null : 'conditions';
}
