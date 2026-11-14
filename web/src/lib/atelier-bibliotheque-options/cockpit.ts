// LA BIBLIOTHÈQUE DES OPTIONS AU COCKPIT, SOUS LE CONSTAT CONFIRMÉ D'UNE
// HYPOTHÈSE ([[D-480]] §1, §8 ; BP-17 PR 6 ; cadrage BIO-PARCOURS v3 `:260`).
// Patron : `positions-expert/cockpit.ts`.
//
// Pour chaque hypothèse dont le constat du praticien est « confirmée », TOUTES
// les options que la structure déclare pour elle se listent :
//   - AUCUNE N'EST CHOISIE D'APRÈS LE DOSSIER : la seule entrée est la liste des
//     codes d'hypothèse confirmés ; aucune donnée du dossier n'entre ici, et
//     aucune option n'est retirée, classée ni mise en avant (ordre des
//     identifiants) ;
//   - AUCUN CONTRÔLE N'EST FAIT : ni admissibilité, ni contre-indication, ni
//     interaction, ni population au regard du dossier — l'écran le dit ;
//   - SEUL UN TEXTE VALIDÉ S'AFFICHE : un texte à valider, retiré, à relire ou
//     illisible ne montre que son état, jamais son contenu (DC-24) ; et rien
//     ne s'affiche tant que la structure n'est pas SIGNÉE (`etatBibliotheque`).
// Elle n'autorise aucune prescription (§8) : BP-18a choisira.
//
// SOUS `WN_BIBLIOTHEQUE_OPTIONS_COCKPIT` : éteint, rien ne se lit et la route
// des constats ne rend rien de la bibliothèque. Aucun auteur ni validateur ne
// sort d'ici. Ni portail, ni courrier, ni scoring, ni recherche, ni modèle.

import { cockpitOptionsActif } from './drapeau';
import { lireAtelierOptions, type AtelierOptions } from './lecture';
import { contexteDuDepot, signatureDeclareeDuDepot, type ContexteAtelier, type EtatBibliotheque } from './structure';

/** L'état de la structure tel que le cockpit le dit — la signature rompue se nomme. */
export type EtatStructureAuCockpit = EtatBibliotheque | 'signature_rompue';

export type EtatRubriqueAuCockpit = 'validee' | 'a_valider' | 'vide' | 'retiree' | 'a_relire' | 'illisible';

export type RubriqueAuCockpit = {
  rubrique: string;
  /** Les renvois de la structure (claims, positions, information manquante déclarée). */
  renvois: readonly string[];
  etat: EtatRubriqueAuCockpit;
  /** Le texte, seulement s'il est validé sur la structure du jour. */
  texte: string | null;
  /** Date ISO de la validation, seulement s'il est validé. */
  valideLe: string | null;
};

export type OptionAuCockpit = { id: string; populations: readonly string[]; rubriques: RubriqueAuCockpit[] };

export type HypotheseAuCockpit = { hypotheseCode: string; options: OptionAuCockpit[] };

export type OptionsAuCockpit =
  | { lecture: 'ok'; etatStructure: EtatStructureAuCockpit; hypotheses: HypotheseAuCockpit[] }
  /** La bibliothèque n'a pas pu être lue : le dire, jamais « aucune option ». */
  | { lecture: 'echec' };

function etatAuCockpit(etat: AtelierOptions['options'][number]['rubriques'][number]['etat']): EtatRubriqueAuCockpit {
  switch (etat.etat) {
    case 'validee':
    case 'a_valider':
    case 'vide':
    case 'retiree':
    case 'a_relire':
    case 'illisible':
      return etat.etat;
    // Une option déclarée n'a jamais de rubrique « hors structure » ; si elle
    // en avait une, elle ne se dirait pas lisible.
    case 'hors_structure':
      return 'illisible';
  }
}

/** Pure : les options des hypothèses confirmées, rubrique par rubrique. */
export function optionsDesHypotheses(
  atelier: AtelierOptions,
  hypothesesConfirmees: readonly string[],
  signatureDeclaree: boolean,
): OptionsAuCockpit {
  const etatStructure: EtatStructureAuCockpit =
    atelier.structure.etat === 'non_signee' && signatureDeclaree ? 'signature_rompue' : atelier.structure.etat;
  if (atelier.structure.etat !== 'signee') return { lecture: 'ok', etatStructure, hypotheses: [] };
  const codes = [...new Set(hypothesesConfirmees)].sort();
  return {
    lecture: 'ok',
    etatStructure,
    hypotheses: codes.map(hypotheseCode => ({
      hypotheseCode,
      options: atelier.options
        .filter(o => o.hypothese === hypotheseCode)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(o => ({
          id: o.id,
          populations: o.populations,
          rubriques: o.rubriques.map(r => {
            const validee = r.etat.etat === 'validee' && r.version !== null ? { texte: r.version.texte, le: r.etat.le } : null;
            return {
              rubrique: r.rubrique,
              renvois: r.renvois,
              etat: etatAuCockpit(r.etat),
              texte: validee?.texte ?? null,
              valideLe: validee?.le ?? null,
            };
          }),
        })),
    })),
  };
}

/**
 * Les options à lister au cockpit sous ces hypothèses confirmées. Drapeau
 * éteint : `null`, sans lecture. Structure non signée, ou aucune hypothèse
 * confirmée : l'état seul, sans lecture des textes. Un échec de lecture se
 * dit (`echec`), il ne lève pas : les constats restent affichés.
 */
export async function lireOptionsAuCockpit(
  hypothesesConfirmees: readonly string[],
  dependances: {
    lire?: (contexte: ContexteAtelier) => Promise<AtelierOptions>;
    contexte?: () => ContexteAtelier;
    signatureDeclaree?: () => boolean;
    actif?: () => boolean;
  } = {},
): Promise<OptionsAuCockpit | null> {
  const { lire = lireAtelierOptions, contexte = contexteDuDepot, signatureDeclaree = signatureDeclareeDuDepot, actif = cockpitOptionsActif } =
    dependances;
  if (!actif()) return null;
  try {
    const ctx = contexte();
    const declaree = signatureDeclaree();
    if (ctx.etatStructure !== 'signee' || hypothesesConfirmees.length === 0) {
      const vide: AtelierOptions = {
        structure: { etat: ctx.etatStructure, empreinte: ctx.empreinteStructure, nombreOptions: ctx.options.length },
        rubriques: [],
        options: [],
        horsStructure: [],
      };
      return optionsDesHypotheses(vide, hypothesesConfirmees, declaree);
    }
    return optionsDesHypotheses(await lire(ctx), hypothesesConfirmees, declaree);
  } catch (err) {
    // Le nom seul : aucun texte ne va au journal (D-251 §4).
    console.error('[bibliotheque-options cockpit] lecture refusée :', err instanceof Error ? err.name : typeof err);
    return { lecture: 'echec' };
  }
}
