import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';

import type { ContradictionFinding, SourceContradiction } from './contradictionFinding';
import { CONTRADICTIONS_RULES_V1, type ContradictionRule } from './contradictionsV1';
import {
  type DeclencheurAtteint,
  derniereReponseParQuestionnaire,
  evaluerDeclencheur,
  type ReponseOrientation,
} from './orientationEngine';

// Moteur de contradictions déterministe — LOT-01 de la campagne chaîne T0.
//
// Fonction pure : évalue la table `CONTRADICTIONS_RULES_V1` sur des scores qu'on
// lui donne. Aucune logique de scoring nouvelle, aucun accès base, aucun appel
// IA. Une règle ne s'applique que si TOUS ses déclencheurs sont atteints (ET
// logique) et si son statut est `publiee`.
//
// LE DÉTERMINISTE PRODUIT, LE LLM RESTITUE. Le modèle ne crée jamais une
// contradiction et ne peut en supprimer aucune ([[D-003]], `DC-02`) : ce qui
// sort d'ici est imposé à la synthèse comme vigilance non censurable.
//
// LA LECTURE DES SCORES EST CELLE DU MOTEUR D'ORIENTATION, importée et non
// réécrite. Les gardes qui comptent — un recueil incomplet n'est pas une mesure
// basse, un sous-score absent n'est pas zéro (`DC-24`), un plancher ne se
// compare jamais numériquement — vivent là-bas et valent ici à l'identique. Les
// redupliquer aurait fait diverger les deux moteurs en silence, sur exactement
// le genre de défaut qu'aucun test ne rattrape.
//
// CE QUE CETTE PHRASE NE DIT PAS, ET QUI COMPTE AUTANT. La garde de complétude
// ne mord que si le porteur PUBLIE ses comptes (`repondus`/`items`), servis
// seulement depuis la campagne du 2026-08-04. Un `scoresJson` enregistré avant
// et relu tel quel passe la garde avec un total PARTIEL — biaisé vers le bas,
// donc du mauvais côté des trois déclencheurs `<=` de C-STR. Le code est
// identique ; la donnée ne l'est pas.
//
// La parade appartient à l'APPELANT : il doit recalculer depuis `rawAnswers`,
// comme `orientationService` le fait depuis le 2026-08-04 (voir l'en-tête
// d'`orientationEngine.ts`). Tant que ce moteur n'est câblé nulle part, rien
// n'est exposé — mais le lot de câblage doit lire ceci avant d'écrire sa
// première ligne. Le comportement est figé par un banc nommé « limite connue ».

export type EntreeContradictions = {
  reponses: ReponseOrientation[];
  /**
   * Anamnèse, si elle est connue. Absente, aucun déclencheur `drapeau` n'est
   * atteint — on ne déduit rien d'une absence. Aucune règle de la V1 n'en
   * utilise, mais le vocabulaire de déclencheurs est partagé avec l'orientation.
   */
  drapeaux?: DrapeauxAnamnese;
  /**
   * La table à évaluer. Par défaut celle du dépôt — le paramètre existe pour
   * que les gardes fail-closed ci-dessous soient ÉPROUVABLES.
   *
   * Sans lui, la table ne contenant qu'une règle publiée, `DISCORDANCE`, avec
   * un claim et trois déclencheurs, aucun des quatre refus ne serait
   * atteignable par un banc : ils seraient corrects par lecture et prouvés par
   * rien. C'est exactement le défaut que ce lot dénonce ailleurs — un banc
   * vacué est un banc qui ment. `evaluerOrientation` prend déjà ses règles en
   * entrée pour la même raison.
   */
  regles?: ContradictionRule[];
};

/**
 * Les sources des déclencheurs atteints, ou `null` si l'une d'elles ne peut
 * pas être nommée.
 *
 * FAIL-CLOSED SUR LA TRAÇABILITÉ. Une contradiction doit être explicable par les
 * données qui l'ont produite (`DC-34`, `DC-35`) : si une passation ne porte pas
 * son identifiant, le constat ne serait pas remontable jusqu'à elle et le
 * praticien ne pourrait pas vérifier ce qu'on lui affirme. On préfère ne rien
 * produire — c'est la même préférence que partout ailleurs dans cette chaîne.
 *
 * SOUS UN `ou`, LE REFUS PORTE SUR LA BRANCHE QUI A DÉCIDÉ, et il ne cherche
 * pas de repli (relevé en revue le 2026-08-16). Si cette branche vient d'une
 * passation sans identifiant, tout le constat tombe — alors qu'une autre
 * branche, vraie et traçable, aurait pu le porter. Le choix est délibéré :
 * l'évaluation a déjà tranché QUELLE branche est le motif, et produire le
 * constat au nom d'une branche que le moteur n'a pas retenue ferait diverger le
 * motif affiché de la source citée. Direction sûre, faux négatif assumé, et un
 * banc le fige.
 */
function sourcesDesAtteints(
  atteints: DeclencheurAtteint[],
  dernieres: Map<string, ReponseOrientation>,
): SourceContradiction[] | null {
  const sources: SourceContradiction[] = [];
  // Les instruments viennent des déclencheurs ATTEINTS, plus de la forme
  // statique de la règle ([[D-060]] §4) : sous un `ou`, seule la branche qui a
  // décidé est citée — citer les branches muettes ferait porter le constat par
  // des passations qui n'ont rien décidé, et le praticien vérifierait la
  // mauvaise donnée.
  for (const atteint of atteints) {
    for (const instrument of atteint.instruments) {
      const reponse = dernieres.get(instrument.idQuestionnaire);
      if (!reponse?.idReponse) return null;
      sources.push({
        type: 'instrument',
        idQuestionnaire: instrument.idQuestionnaire,
        ...(instrument.sousScore ? { sousScore: instrument.sousScore } : {}),
        reponseId: reponse.idReponse,
        dateReponse: reponse.dateReponse,
      });
    }
  }
  // Une règle dont TOUS les déclencheurs seraient des drapeaux d'anamnèse ne
  // produirait aucune source d'instrument, donc rien du tout. C'est voulu en
  // l'état : le type `SourceContradiction` sait nommer un instrument ou un
  // claim, pas une déclaration d'anamnèse. Le jour où une règle en aura besoin,
  // c'est le type qu'il faudra étendre — pas ce silence qu'il faudra contourner.
  return sources.length > 0 ? sources : null;
}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Fuseau de référence du JOUR CIVIL clinique.
 *
 * Corrigé après contre-revue : un jour civil calculé en UTC fait tomber du
 * mauvais côté toute passation remplie entre minuit et 2 h à Paris — un
 * questionnaire de sommeil rempli le 11/08 à 00 h 40 devient « 10/08 », et
 * l'écran affiche deux dates là où le praticien n'en voit qu'une. Le reste du
 * cockpit formate déjà en heure locale (`TrajectoirePanel`,
 * `EpisodeConfirmationPanel`) : ce lot s'aligne au lieu d'introduire un
 * troisième régime.
 */
export const FUSEAU_CLINIQUE = 'Europe/Paris';

/** Jour civil `AAAA-MM-JJ` dans le fuseau clinique, ou `null` si illisible. */
export function jourCivilClinique(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // `en-CA` rend `AAAA-MM-JJ`, seul format qui se compare et se trie tel quel.
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU_CLINIQUE }).format(new Date(ms));
}

/**
 * Écart en jours entre la passation la plus ancienne et la plus récente parmi
 * les sources d'instrument ([[D-048]]).
 *
 * COMPTE LES PASSATIONS DISTINCTES, PAS LES SOURCES. Une règle peut viser deux
 * sous-scores du MÊME questionnaire — C-STR interroge `Q_STR_04` deux fois —
 * et cela ne fait qu'une passation. Compter les sources rendrait `0` là où il
 * n'y a rien à comparer, c'est-à-dire exactement le zéro trompeur que `DC-24`
 * proscrit.
 *
 * Rend `null` en dessous de deux passations distinctes : « non applicable »,
 * jamais « le même jour ».
 */
function ecartJoursEntreSources(sources: SourceContradiction[]): number | null {
  const parPassation = new Map<string, number>();
  for (const source of sources) {
    if (source.type !== 'instrument') continue;
    // JOUR CIVIL DU FUSEAU CLINIQUE, pas tranche de 24 h ni jour UTC.
    const jour = jourCivilClinique(source.dateReponse);
    // Une date illisible ne vaut pas zéro : la passation sort du calcul, et si
    // moins de deux subsistent l'écart devient `null`.
    if (jour === null) continue;
    parPassation.set(source.reponseId, Date.parse(`${jour}T00:00:00.000Z`));
  }
  if (parPassation.size < 2) return null;
  const dates = [...parPassation.values()];
  // Différence de jours civils : les bornes sont déjà alignées sur minuit, le
  // quotient est donc exact. Un arrondi sur la durée brute faisait dire « le
  // même jour » à deux passations séparées par minuit, et « 2 jours » à un
  // écart d'un jour civil. Or l'écran nomme les DATES : un écart qui les
  // contredit se voit.
  return Math.round((Math.max(...dates) - Math.min(...dates)) / JOUR_MS);
}

/**
 * Évalue la table et rend les contradictions constatées.
 *
 * Trois raisons de ne rien produire pour une règle, et toutes sont voulues :
 * son statut n'est pas `publiee`, elle n'épingle aucun claim (une règle sans
 * source n'est pas traçable — `DC-01`, `DC-26` — et le contrat de fraîcheur
 * n'aurait rien à contrôler), ou l'un de ses déclencheurs n'est pas atteint.
 */
export function evaluerContradictions(entree: EntreeContradictions): ContradictionFinding[] {
  const dernieres = derniereReponseParQuestionnaire(entree.reponses);
  const constats: ContradictionFinding[] = [];

  for (const regle of entree.regles ?? CONTRADICTIONS_RULES_V1) {
    if (regle.statut !== 'publiee') continue;
    if (regle.justificationClaims.length === 0) continue;

    // SEULE `DISCORDANCE` EST PRODUITE — [[D-041]]. Les deux autres formes sont
    // prévues par le type et vides à la livraison. Ce garde n'est pas
    // décoratif : sans lui, une règle déclarée `CONVERGENCE` sortirait d'ici
    // étiquetée `DISCORDANCE`, avec sa graduation perdue en route. Produire la
    // mauvaise forme est pire que ne rien produire.
    if (regle.forme !== 'DISCORDANCE') continue;

    // ET logique : un seul déclencheur non atteint éteint la règle. La liste
    // vide est refusée avant — une règle sans déclencheur s'allumerait pour
    // tout le monde, ce qui est le pire défaut possible ici. Les atteints sont
    // COLLECTÉS, pas seulement comptés : ce sont eux qui nomment les sources.
    if (regle.declencheurs.length === 0) continue;
    const atteints: DeclencheurAtteint[] = [];
    let tousAtteints = true;
    for (const declencheur of regle.declencheurs) {
      const atteint = evaluerDeclencheur(declencheur, dernieres, entree.drapeaux);
      if (atteint === null) {
        tousAtteints = false;
        break;
      }
      atteints.push(atteint);
    }
    if (!tousAtteints) continue;

    const sources = sourcesDesAtteints(atteints, dernieres);
    if (!sources) continue;

    constats.push({
      forme: 'DISCORDANCE',
      // Une règle produit au plus un constat par évaluation — l'identifiant du
      // constat est donc celui de la règle. Le jour où une règle en produirait
      // plusieurs (une par paire de sources, par exemple), cet identifiant
      // devra les distinguer.
      id: regle.id,
      audience: 'praticien_seul',
      sources,
      description: regle.description,
      importance: regle.importance,
      hypotheses: regle.hypotheses,
      actionSuggeree: regle.actionSuggeree,
      resolution: { statut: 'ouverte' },
      justificationClaims: regle.justificationClaims,
      regleId: regle.id,
      limitations: regle.limitations,
      // Le constat est produit QUEL QUE SOIT l'écart ([[D-048]]) : il le porte,
      // il ne s'en sert pas pour se taire. Aucun seuil ici, et c'est la
      // décision — `DC-30` interdit de supprimer une discordance en silence.
      ecartJoursEntreSources: ecartJoursEntreSources(sources),
      // Recopié comme `importance`, sans transformation. Absent quand la règle
      // n'en porte pas : une clé vide ne dirait pas « aucun recoupement », elle
      // dirait « recoupement non renseigné ».
      ...(regle.recoupementJustifie ? { recoupementJustifie: regle.recoupementJustifie } : {}),
    });
  }

  return constats;
}
