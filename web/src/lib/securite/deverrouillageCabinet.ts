// LE DÉVERROUILLAGE D'UNE ASSIGNATION D'UN INSTRUMENT DU CABINET — [[D-524]] §2
// (réponse 20261114-2145-a, option B), prérequis de l'allumage du drapeau
// NF-7 (§3), retiré depuis ([[D-528]]).
//
// Le contenu d'un instrument est gelé tant qu'un envoi est en cours, mais une
// assignation VERROUILLÉE ne compte plus comme envoi en cours : l'instrument
// peut alors changer, puis l'assignation être déverrouillée, et le patient
// répondre sur la définition nouvelle alors que `SAF-QUEST-02` lit la copie
// prise à l'envoi ([[D-515]] §4). Des options renumérotées, ou une question
// sur le suicide qui change d'identifiant, suffisent à faire manquer un
// constat.
//
// D'où le refus : une assignation `CAB_` dont la copie de déclaration vaut
// « oui » ne se déverrouille que si sa copie de désignation est EXACTEMENT
// celle que l'envoi écrirait aujourd'hui (`copieDesignationSuicide`). Toute
// discordance, une désignation courante absente (brouillon, déclaration
// effacée, instrument introuvable) ou une copie illisible refusent :
// fail-closed. Le praticien réenvoie l'instrument. La copie de l'envoi n'est
// JAMAIS réécrite ici.
//
// Module pur : la route lit l'instrument sous verrou et appelle `concordance`.

import {
  copieDesignationSuicide,
  type DesignationSuicideCopiee,
} from '@/lib/securite/declarationSuicideCabinet';

export const RAISON_INSTRUMENT_MODIFIE = 'instrument_modifie';

// Le message couvre les deux causes du refus — l'instrument a changé (nom
// compris, la copie le porte), ou la copie manque depuis l'envoi — et dit la
// sortie : un réenvoi, après l'annulation de l'assignation quand elle attend
// encore sa réponse (sinon le réenvoi bute sur « déjà assigné »). Revue
// `wn-reviewer` du lot, P2-2 et P2-3.
export const MESSAGE_INSTRUMENT_MODIFIE =
  'La copie de l’instrument prise à l’envoi ne correspond plus à l’instrument, ou elle manque : ce questionnaire ne peut pas être débloqué. Envoyez l’instrument de nouveau, après avoir annulé cette assignation si elle n’a pas encore de réponse.';

/** La copie portée par l'assignation, telle que la base la rend. */
export type CopieAssignation = {
  poseQuestionSuicide: boolean | null;
  questionSuicideId: string | null;
  questionSuicideOptionNon: number | null;
  questionSuicideCopie: unknown;
};

/** La ligne courante de l'instrument, lue sous verrou ; `null` = introuvable. */
export type InstrumentCourant = {
  actif: boolean;
  statutRelecture: string;
  titre: string;
  definitionJson: unknown;
  poseQuestionSuicide: boolean | null;
  questionSuicideId: string | null;
  questionSuicideOptionNon: number | null;
};

/** Le refus s'applique-t-il à cette assignation : un `CAB_` dont la copie dit « oui ». */
export function deverrouillageAJuger(copie: Pick<CopieAssignation, 'poseQuestionSuicide'>): boolean {
  return copie.poseQuestionSuicide === true;
}

function memesOptions(a: unknown, b: { v: number; l: string }[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((option, i) => {
    if (typeof option !== 'object' || option === null) return false;
    const { v, l } = option as { v?: unknown; l?: unknown };
    return v === b[i].v && l === b[i].l;
  });
}

function copieEgale(copie: CopieAssignation, courante: DesignationSuicideCopiee): boolean {
  if (copie.questionSuicideId !== courante.questionSuicideId) return false;
  if (copie.questionSuicideOptionNon !== courante.questionSuicideOptionNon) return false;
  const json = copie.questionSuicideCopie;
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return false;
  const { instrument, enonce, options } = json as Record<string, unknown>;
  return (
    instrument === courante.questionSuicideCopie.instrument
    && enonce === courante.questionSuicideCopie.enonce
    && memesOptions(options, courante.questionSuicideCopie.options)
  );
}

/**
 * Vrai si la copie de l'assignation concorde avec la désignation que l'envoi
 * écrirait aujourd'hui depuis la ligne courante de l'instrument. Faux dès que
 * la désignation courante manque — instrument introuvable, désactivé ou non
 * publié (brouillon, grille à relire : l'envoi ne l'écrirait pas), déclaration
 * autre que « oui », désignation incohérente avec la définition — ou que la
 * copie de l'assignation est vide ou illisible.
 *
 * Le statut est lu ICI, sans le drapeau : drapeau éteint, une modification
 * du contenu repasse l'instrument en brouillon SANS effacer sa déclaration ;
 * une désignation restée concordante laisserait sinon rouvrir la saisie sur
 * un brouillon (contre-revue Codex de #2151, P1). [[D-524]] §2 nomme le
 * retour en brouillon parmi les désignations absentes.
 */
export function concordance(copie: CopieAssignation, instrument: InstrumentCourant | null): boolean {
  if (!instrument || !instrument.actif || instrument.statutRelecture !== 'valide') return false;
  if (instrument.poseQuestionSuicide !== true) return false;
  const courante = copieDesignationSuicide(instrument);
  if (!courante) return false;
  return copieEgale(copie, courante);
}
