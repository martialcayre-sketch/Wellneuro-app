import { estNatureComplement } from '@/lib/clinical-engine/complementCible';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { StatutAge } from '@/lib/patient/gardeAge';
import type { VerdictPartageMedecin } from '@/lib/trust/consentementPartage';
import {
  DECLENCHEURS_COMPLEMENT_METADATA,
  DECLENCHEURS_COMPLEMENT_V1,
  tableDeclencheursSignee,
  type DeclencheursMetadata,
  type IdDeclencheur,
  type LigneDeclencheur,
} from './declencheursComplementCibleV1';

// LA GARDE DU COMPLÉMENT CIBLÉ — [[D-345]] §1 à §6, J3-12h, lot 1 (G2 de la
// fiche de cadrage). Un courrier au médecin est-il requis avant que ces
// intentions de complément entrent au programme ?
//
// PRÉDICAT PUR : aucune horloge, aucune base, aucun appelant de production à
// ce lot. Le clic de diffusion le consommera au lot 3, sous drapeau, avec la
// trace de remise du lot 2. La table et sa signature sont des PARAMÈTRES
// (patron `gatePopulationV1`) : le banc exerce chaque branche sans qu'aucune
// donnée non relue n'existe hors du test.
//
// IL NE DIT PAS SI UN COURRIER A ÉTÉ REMIS. Il dit s'il en faut un, pour quels
// compléments — la liste couverte de D-345 §5 — et si le dossier permet de le
// préparer. L'accord de partage est relu à CHAQUE appel : une remise
// antérieure prouve la remise, pas l'accord (fiche, points tranchés par
// défaut).

export type CritereEtat = 'grossesse' | 'allaitement';

/**
 * Une déclaration de grossesse ou d'allaitement, datée. `praticien` et
 * `patient` : lignes de la fiche physiologique ([[D-335]]) ; `anamnese` :
 * réponse du patient au formulaire, datée par son envoi. Seul un « non » du
 * praticien lève (D-345 §3).
 */
export type DeclarationEtat = {
  critere: CritereEtat;
  reponse: 'oui' | 'non' | 'inconnu';
  source: 'praticien' | 'patient' | 'anamnese';
  /** Instant ISO de la déclaration ; `null` ou illisible = non datée. */
  le: string | null;
};

export type EntreeGardeComplement = {
  actions: readonly ProtocolAction[];
  /** `statutAge` de `patient/gardeAge.ts`, calculé par l'appelant à l'instant du clic. */
  statutAge: StatutAge;
  declarations: readonly DeclarationEtat[];
  /** Motif de `verdictPartageMedecin` : seul `accorde` ouvre. */
  accordPartage: VerdictPartageMedecin['motif'];
};

export type EtatCritere = 'declenche' | 'leve' | 'a_etablir';

/** Motif obligatoire sur chaque verdict, y compris quand rien n'est requis (`DC-35`). */
export type VerdictGardeComplement =
  | { statut: 'non_requis'; motif: string }
  | { statut: 'nature_requise'; motif: string; actionIds: string[] }
  | { statut: 'table_non_signee'; motif: string }
  | { statut: 'date_requise'; motif: string }
  | { statut: 'mineur'; motif: string }
  | { statut: 'situation_inconnue'; motif: string; actionIds: string[] }
  | { statut: 'etat_a_etablir'; motif: string; criteres: CritereEtat[] }
  | {
    statut: 'accord_requis';
    motif: string;
    accord: Exclude<VerdictPartageMedecin['motif'], 'accorde'>;
    declencheurs: IdDeclencheur[];
  }
  | { statut: 'requis'; motif: string; declencheurs: IdDeclencheur[]; actionIdsCibles: string[] };

const MOTIF_AUCUN_COMPLEMENT = 'Aucune intention de complément au programme : aucun courrier n’est requis.';
const MOTIF_AUCUN_CIBLE =
  'Aucun complément ciblé : un multivitaminé en vente libre n’appelle pas de courrier (D-345 §1).';
const MOTIF_NATURE_REQUISE =
  'Indiquez pour chaque complément s’il est ciblé ou multivitaminé en vente libre : la nature ne se devine pas.';
const MOTIF_TABLE_NON_SIGNEE =
  'La table des déclencheurs n’est pas signée : aucun complément ciblé ne peut entrer au programme.';
const MOTIF_DATE_REQUISE =
  'La date de naissance du patient est requise avant un complément ciblé.';
const MOTIF_MINEUR =
  'Patient mineur : un complément ciblé reste suspendu jusqu’au circuit des mineurs, quel que soit le courrier.';
const MOTIF_SITUATION_INCONNUE =
  'Une situation déclarée sur un complément ciblé n’est pas dans la table signée des déclencheurs.';
const MOTIF_ETAT_A_ETABLIR =
  'Grossesse ou allaitement à établir : seule une réponse « non » du praticien lève la garde.';
const MOTIF_NON_REQUIS =
  'Complément ciblé sans déclencheur atteint : aucun courrier n’est requis.';
const MOTIF_REQUIS =
  'Un courrier au médecin doit être remis au patient avant que ces compléments ciblés entrent au programme.';
const MOTIF_ACCORD: Record<Exclude<VerdictPartageMedecin['motif'], 'accorde'>, string> = {
  refuse: 'Courrier requis, mais le patient a refusé le partage avec son médecin : pas de complément ciblé.',
  retire: 'Courrier requis, mais le patient a retiré son accord de partage avec son médecin : pas de complément ciblé.',
  jamais_exprime: 'Courrier requis, mais le patient n’a jamais exprimé son choix de partage avec son médecin : '
    + 'pas de complément ciblé tant qu’il ne l’a pas fait.',
};

const CRITERES: readonly CritereEtat[] = ['allaitement', 'grossesse'];

/** Instant ISO CANONIQUE seulement : une date lisible mais non canonique vaut non datée. */
function instant(le: string | null): number | null {
  if (le === null) return null;
  const date = new Date(le);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== le) return null;
  return date.getTime();
}

/**
 * LE DERNIER MOT DU PRATICIEN, ET LUI SEUL. Un « non » remplacé ensuite par
 * « inconnu » ne lève plus rien : sur un historique, le maximum de tous les
 * « non » lèverait encore la garde (revue `wn-reviewer` du lot 1, P1-2). Rend
 * l'instant du dernier « non » s'il est le dernier mot, sinon `null`. À
 * égalité d'instant, un seul mot autre que « non » suffit à ne pas lever.
 */
function dernierNonDuPraticien(visees: readonly DeclarationEtat[]): number | null {
  const praticien = visees
    .filter(declaration => declaration.source === 'praticien')
    // Non datée, une ligne vaut ANCIENNE si elle est un « non », la PLUS
    // RÉCENTE sinon : l'incertitude ferme dans les deux cas (revue CodeRabbit).
    .map(declaration => ({
      reponse: declaration.reponse,
      t: instant(declaration.le)
        ?? (declaration.reponse === 'non' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY),
    }));
  if (praticien.length === 0) return null;
  const dernier = Math.max(...praticien.map(ligne => ligne.t));
  const auDernier = praticien.filter(ligne => ligne.t === dernier);
  return auDernier.every(ligne => ligne.reponse === 'non') ? dernier : null;
}

/**
 * LA LECTURE DE Q4 DANS LE TEMPS (fiche de cadrage, points tranchés par
 * défaut). Aucune déclaration n'expire : une durée de validité serait une
 * borne clinique sans provenance.
 *
 * - un « oui », de toute source, déclenche tant qu'aucun « non » DU PRATICIEN
 *   ne lui est STRICTEMENT postérieur — à égalité, le « oui » tient ;
 * - un « non » du praticien antérieur à un « oui » ne lève rien ;
 * - une date absente ou illisible vaut ANCIENNE pour un « non » et déclenche
 *   pour un « oui » : dans les deux cas, l'incertitude ferme ;
 * - sans « oui » à tenir, un « non » du praticien lève s'il est son DERNIER
 *   mot sur ce critère ; sinon l'état est à établir — le « non » du patient ou
 *   de l'anamnèse ne lève pas, et le sexe déclaré ne dispense de rien.
 *
 * L'appelant passe les lignes EN VIGUEUR (têtes de fil, retraits exclus) ;
 * la règle du dernier mot tient aussi sur un historique complet.
 */
export function lireEtatCritere(critere: CritereEtat, declarations: readonly DeclarationEtat[]): EtatCritere {
  const visees = declarations.filter(declaration => declaration.critere === critere);
  const ouis = visees
    .filter(declaration => declaration.reponse === 'oui')
    .map(declaration => instant(declaration.le) ?? Number.POSITIVE_INFINITY);
  const dernierNon = dernierNonDuPraticien(visees);
  if (ouis.some(oui => dernierNon === null || oui >= dernierNon)) return 'declenche';
  return dernierNon === null ? 'a_etablir' : 'leve';
}

function triees(valeurs: Iterable<string>): string[] {
  return [...new Set(valeurs)].sort((gauche, droite) => (gauche < droite ? -1 : gauche > droite ? 1 : 0));
}

/**
 * LE VERDICT, ET SON ORDRE EST UNE DÉCISION.
 *
 * 1-3. L'objet gardé d'abord : sans complément, rien ; une intention sans
 *      nature se refuse (fail-closed, D-345 §1) ; sans « ciblé », rien.
 * 4.   Table non signée : tout complément ciblé se refuse.
 * 5.   L'âge : date manquante, puis mineur — refusés quel que soit le reste.
 * 6-7. Les déclencheurs : un seul atteint rend le courrier requis, même si un
 *      autre critère reste à établir — le courrier couvre les deux, l'issue
 *      est celle d'un « oui ». Requis sans accord de partage : refus.
 * 8-9. Aucun déclencheur : un critère à établir se refuse ; sinon rien.
 */
export function courrierComplementRequis(
  entree: EntreeGardeComplement,
  table: readonly LigneDeclencheur[] = DECLENCHEURS_COMPLEMENT_V1,
  signature: DeclencheursMetadata = DECLENCHEURS_COMPLEMENT_METADATA,
): VerdictGardeComplement {
  const complements = entree.actions.filter(action => action.type === 'supplement_exploration');
  if (complements.length === 0) return { statut: 'non_requis', motif: MOTIF_AUCUN_COMPLEMENT };

  // HORS LISTE VAUT ABSENTE : une valeur forgée ne doit pas passer pour un
  // multivitaminé, qui n'est pas gardé. Le contrat la refuse déjà à l'écriture
  // et à la relecture ; le prédicat ne s'en remet pas à eux.
  const sansNature = complements.filter(action => !estNatureComplement(action.natureComplement));
  if (sansNature.length > 0) {
    return {
      statut: 'nature_requise',
      motif: MOTIF_NATURE_REQUISE,
      actionIds: triees(sansNature.map(action => action.actionId)),
    };
  }

  const cibles = complements.filter(action => action.natureComplement === 'cible');
  if (cibles.length === 0) return { statut: 'non_requis', motif: MOTIF_AUCUN_CIBLE };

  if (!tableDeclencheursSignee(signature, table)) {
    return { statut: 'table_non_signee', motif: MOTIF_TABLE_NON_SIGNEE };
  }

  if (entree.statutAge === 'mineur') return { statut: 'mineur', motif: MOTIF_MINEUR };
  // Seul « majeur » ouvre : une valeur hors liste se lit comme une date manquante.
  if (entree.statutAge !== 'majeur') return { statut: 'date_requise', motif: MOTIF_DATE_REQUISE };

  const situationsConnues = new Set<string>(
    table.filter(ligne => ligne.nature === 'situation').map(ligne => ligne.id),
  );
  const situationInconnue = cibles.filter(action =>
    (action.situationsComplement ?? []).some(situation => !situationsConnues.has(situation)));
  if (situationInconnue.length > 0) {
    return {
      statut: 'situation_inconnue',
      motif: MOTIF_SITUATION_INCONNUE,
      actionIds: triees(situationInconnue.map(action => action.actionId)),
    };
  }

  const etats = CRITERES.map(critere => ({ critere, etat: lireEtatCritere(critere, entree.declarations) }));
  const declencheurs = triees([
    ...etats.filter(({ etat }) => etat === 'declenche').map(({ critere }) => critere),
    ...cibles.flatMap(action => action.situationsComplement ?? []),
  ]) as IdDeclencheur[];

  if (declencheurs.length > 0) {
    if (entree.accordPartage !== 'accorde') {
      // Un motif hors type ne passe ni pour un accord, ni sans motif : il se
      // lit comme un choix jamais exprimé.
      const accord = Object.hasOwn(MOTIF_ACCORD, entree.accordPartage) ? entree.accordPartage : 'jamais_exprime';
      return { statut: 'accord_requis', motif: MOTIF_ACCORD[accord], accord, declencheurs };
    }
    return {
      statut: 'requis',
      motif: MOTIF_REQUIS,
      declencheurs,
      actionIdsCibles: triees(cibles.map(action => action.actionId)),
    };
  }

  const aEtablir = etats.filter(({ etat }) => etat === 'a_etablir').map(({ critere }) => critere);
  if (aEtablir.length > 0) {
    return { statut: 'etat_a_etablir', motif: MOTIF_ETAT_A_ETABLIR, criteres: aEtablir };
  }
  return { statut: 'non_requis', motif: MOTIF_NON_REQUIS };
}
