// Banc de la garde de passation vide — 2026-07-29.
//
// Ce que ce banc protège : un verdict clinique sorti de rien. Mesuré en appelant
// `calculateScore(id, {})` sur le catalogue entier, **40 verdicts sortaient de 22
// instruments** sans une seule réponse — trente en direction rassurante (« Pas de
// trouble du sommeil », « Absence de symptomatologie », « Risque faible d'apnée du
// sommeil ») et dix en direction alarmante, dont « Trouble de la mémoire épisodique
// — consultation neurologique » sur un test non répondu.
//
// Aucune des deux directions n'est moins fausse que l'autre : la question n'est pas
// la sévérité du verdict, c'est qu'il n'y a rien à juger.
//
// Le balayage est écrit en balayage, et non en liste : un instrument ajouté demain
// est couvert sans que personne ait à y penser.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { calculerNiveauPreuveBesoin } from '@/lib/equilibre/evidence';

/** Les trois instruments qui portent leur propre motif de non-scoré. */
const PROPRE_MOTIF = ['Q_SOM_09', 'Q_URO_02', 'Q_FIB_03'];

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? []).flatMap((s: any) => s.questions ?? []);

/** Tout libellé d'interprétation rendu par un résultat, racine et sous-scores. */
function verdicts(resultat: any): string[] {
  const sortie: string[] = [];
  if (resultat?.interpretation?.label) sortie.push(resultat.interpretation.label);
  for (const cle of ['subScores', 'parts', 'components', 'categories', 'dimensions', 'phases']) {
    for (const s of resultat?.[cle] ?? []) {
      if (s?.interpretation?.label) sortie.push(`${s.id}: ${s.interpretation.label}`);
    }
  }
  return sortie;
}

describe('passation vide — rien à juger, donc aucun verdict', () => {
  it('aucun instrument du catalogue ne rend de verdict sur une passation vide', () => {
    const coupables: string[] = [];
    let examines = 0;
    for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
      if (!itemsDe(id).length) continue;
      examines++;
      const rendus = verdicts(calculateScore(id, {}));
      if (rendus.length) coupables.push(`${id} → ${rendus.join(' | ')}`);
    }
    // Le balayage doit mordre : un catalogue vide passerait pour un succès.
    // Valeur EXACTE : un plancher lâche laisserait passer une régression sur
    // une vingtaine d'instruments sans rougir.
    expect(examines).toBe(64);
    expect(coupables, `verdicts sur une passation vide :\n  ${coupables.join('\n  ')}`).toEqual([]);
  });

  it('aucun instrument ne rend de total sur une passation vide', () => {
    // Un total de 0 vaut verdict pour `equilibre/score.ts`, qui l'accepte comme une
    // valeur : sur une source de fondation critique, cela plafonnait l'indice.
    for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
      if (!itemsDe(id).length) continue;
      const r: any = calculateScore(id, {});
      expect(r.total ?? null, `${id} rend un total sur une passation vide`).toBeNull();
      expect(r.scored, `${id} ne se déclare pas non scoré`).toBe(false);
      // Et il dit POURQUOI. Trois instruments le disent autrement, parce qu'ils
      // portaient déjà leur propre non-scoré avec un motif plus précis que le
      // générique : l'agenda du sommeil annonce ses métriques incomplètes, les deux
      // journaux annoncent qu'ils n'ont jamais de score global. La garde générale
      // les laisse passer plutôt que d'écraser ce motif.
      const motif = r.raisonNonScore ?? (PROPRE_MOTIF.includes(id) ? r.note : null);
      expect(motif, `${id} ne dit pas pourquoi il ne score pas`).toBeTruthy();
    }
  });

  it('la garde n’écrase pas le motif de ceux qui en ont déjà un meilleur', () => {
    // L'agenda du sommeil et les journaux disaient déjà POURQUOI ils ne scorent
    // pas — métriques trop incomplètes pour l'un, absence de score global par
    // nature pour les autres. Le motif générique de la garde (« aucune réponse ne
    // correspond aux items ») est plus pauvre, et faux pour un journal : il n'a
    // jamais de score, quelles que soient les réponses.
    for (const id of PROPRE_MOTIF) {
      const r: any = calculateScore(id, {});
      expect(r.scored, `${id} devrait rester non scoré`).toBe(false);
      expect(r.raisonNonScore, `${id} : la garde générale a écrasé son motif`).toBeUndefined();
      expect(r.note, `${id} a perdu son motif propre`).toBeTruthy();
    }

    // L'agenda garde en outre son décompte de nuits, que le générique perdrait.
    const agenda: any = calculateScore('Q_SOM_09', {});
    expect(agenda).toHaveProperty('nbNuits');
  });

  it('une passation dont AUCUNE clé n’appartient à l’instrument vaut une passation vide', () => {
    // Le cas vivant en production : les identifiants d'un instrument changent, et
    // une passation ancienne est relue sous une définition dont elle ne porte
    // aucune clé (`AL*` contre `SIIN*` sur Q_ALI_01). Elle tombait ici, et sortait
    // avec un verdict.
    const r: any = calculateScore('Q_SOM_01', { CLE_INCONNUE: 3, AUTRE: 1 });
    expect(r.scored).toBe(false);
    expect(verdicts(r)).toEqual([]);
  });

  it('la garde ne mord QUE sur le vide : une seule réponse rend la main au moteur', () => {
    // Sans ce contrôle, une garde trop large supprimerait des scores légitimes —
    // le risque symétrique, et le plus coûteux des deux.
    let scores = 0;
    for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
      const items = itemsDe(id);
      if (!items.length) continue;
      const complet = Object.fromEntries(items.map((q: any) => [
        q.id,
        q.options?.length ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value))) : (q.max ?? 1),
      ]));
      const r: any = calculateScore(id, complet);
      if (r.scored !== false) scores++;
    }
    // Les seuls non scorés sur une passation COMPLÈTE sont les deux `journal`,
    // qui n'ont par nature aucun score global.
    expect(scores).toBe(62);

    // Et surtout : une passation PARTIELLE score encore. C'est là que se joue la
    // largeur de la garde — un premier jet de cette assertion ne remplissait que
    // des passations complètes, et laissait donc passer une garde élargie à
    // « au moins un item manquant », qui aurait effacé presque tous les scores.
    let partiels = 0;
    for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE as any)) {
      const items = itemsDe(id);
      if (items.length < 3) continue;
      const q = items[0];
      const une = {
        [q.id]: q.options?.length
          ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value)))
          : (q.max ?? 1),
      };
      const r: any = calculateScore(id, une);
      if (r.scored !== false) partiels++;
    }
    // 62 instruments portent au moins trois items ; les trois non scorés sur une
    // réponse unique sont exactement ceux qui portent leur propre motif.
    expect(partiels).toBe(62 - PROPRE_MOTIF.length);
  });

  it('« Mon équilibre » ne fabrique plus de preuve à partir d’une passation vide', () => {
    // C'est la conséquence qui compte : `calculerNiveauPreuveBesoin` rendait
    // « preuve de niveau A » pour le besoin 5 sur un PSQI sans aucune réponse
    // reconnue. Un badge de preuve fabriqué, de la classe corrigée en #430.
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: {} })).toBe('NON_MESURE');
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' } })).toBe('NON_MESURE');

    // Et une passation réellement répondue reste une preuve. Les dix items de
    // perturbation ont été ajoutés le 2026-07-29 : sans eux, deux des sept
    // composantes du PSQI ne sont pas mesurées, et l'instrument ne rend plus de
    // total — la fixture aurait prouvé le contraire de ce qu'elle annonce.
    const psqi = {
      Q1: 23, Q2: 15, Q3: 7, Q4: 7,
      Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
      Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      Q6: 1, Q7: 0, Q8: 0, Q9: 1,
    };
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: psqi })).toBe('A');
    // Et une passation AMPUTÉE d'une composante n'en est plus une : c'est le lot
    // du 2026-07-29 sur les moteurs à composantes.
    const { Q5b: _b, Q5c: _c, ...sansPerturbations } = psqi;
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: sansPerturbations })).toBe('NON_MESURE');
  });
});
