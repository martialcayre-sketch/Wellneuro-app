// Banc des inversions DÉCLARÉES mais non honorées — 2026-07-31.
//
// Plusieurs branches du moteur lisent leurs items avec une liste d'inversions
// VIDE, écrite en dur : `sumItems(items, [])`, `totalSousScore(sub.items, [])`.
// Une définition qui déclarerait `reversed` sur l'une d'elles verrait sa
// déclaration ignorée — sans erreur, sans avertissement, et sans qu'un test
// existant s'en aperçoive.
//
// C'est exactement ce qui est arrivé à la branche `subscore`, où vivait le
// MFI-20 : sa source impose d'inverser dix items sur vingt, et aucune inversion
// n'était appliquée. Additionner sans inverser revient à sommer la fatigue et la
// vigueur dans le même sens. La branche a été corrigée le 2026-07-31 ; les
// autres ne l'ont pas été, faute d'un usage qui le justifie.
//
// CE BANC NE CORRIGE RIEN. Il rend le piège BRUYANT : le jour où un instrument
// déclarera `reversed` sur une branche restée à `[]`, le CI le dira, au lieu de
// laisser un score faux se calculer en silence. C'est la seule chose qui rende
// sûr un correctif volontairement local.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

/**
 * Les types de scoring dont le moteur HONORE les inversions déclarées. Toute
 * autre branche les ignore : y déclarer `reversed` est un piège, pas une
 * fonctionnalité.
 */
const HONORENT_LES_INVERSIONS = new Set(['subscore', 'upps', 'karasek']);

/** Toutes les listes d'items d'un scoring, quel que soit le porteur du découpage. */
function decoupages(sc: any): any[] {
  if (!sc || typeof sc !== 'object') return [];
  return [
    ...(sc.subScores ?? []),
    ...(sc.dimensions ?? []),
    ...(sc.phases ?? []),
    ...(sc.parts ?? []),
    ...(sc.sousScoresBesoins ?? []),
    ...(sc.echelles ?? []),
  ];
}

describe('inversions déclarées — jamais sur une branche qui les ignore', () => {
  it('aucun instrument ne déclare `reversed` sur un scoring qui ne le lit pas', () => {
    const pieges: string[] = [];
    for (const [id, def] of Object.entries(QUESTIONNAIRE_CATALOGUE as Record<string, any>)) {
      const sc = def?.scoring;
      if (!sc || HONORENT_LES_INVERSIONS.has(sc.type)) continue;
      for (const d of decoupages(sc)) {
        if (Array.isArray(d?.reversed) && d.reversed.length > 0) {
          pieges.push(`${id} (${sc.type}) / ${d.id ?? '?'} : ${d.reversed.join(', ')}`);
        }
      }
      if (Array.isArray(sc.reversed) && sc.reversed.length > 0) {
        pieges.push(`${id} (${sc.type}) : reversed au niveau du scoring`);
      }
    }
    expect(
      pieges,
      'inversions déclarées sur une branche qui les ignore — le score serait calculé SANS elles, en silence :\n  '
        + pieges.join('\n  '),
    ).toEqual([]);
  });

  it('ANTI-VACUITÉ : la liste des branches qui les honorent n’est pas vide, et elle porte', () => {
    // Sans ceci, vider `HONORENT_LES_INVERSIONS` rendrait le test ci-dessus plus
    // strict en apparence — et le rendrait rouge, donc on le remarquerait. Le
    // vrai risque est l'inverse : y ajouter un type qui n'honore rien, ce qui
    // désarmerait la garde en silence. On épingle donc les porteurs RÉELS.
    const parType = new Map<string, string[]>();
    for (const [id, def] of Object.entries(QUESTIONNAIRE_CATALOGUE as Record<string, any>)) {
      const sc = def?.scoring;
      if (!sc) continue;
      const aDesInversions = decoupages(sc).some((d: any) => Array.isArray(d?.reversed) && d.reversed.length > 0)
        || (Array.isArray(sc.reversedItems) && sc.reversedItems.length > 0)
        || decoupages(sc).some((d: any) => Array.isArray(d?.reversedItems) && d.reversedItems.length > 0);
      if (aDesInversions) parType.set(sc.type, [...(parType.get(sc.type) ?? []), id]);
    }
    // Deux types déclarent réellement des inversions par sous-échelle
    // aujourd'hui : `upps` (25 items renversés) et `subscore` (le MFI-20, depuis
    // ce lot). `karasek` porte les siennes sous `reversedItems`.
    expect([...parType.keys()].sort()).toEqual(['karasek', 'subscore', 'upps']);
    expect(parType.get('subscore')).toEqual(['Q_SOM_07']);
  });

  it('les six autres instruments à `subscore` n’en déclarent aucune — le correctif ne les touche pas', () => {
    // La propriété que le lot du MFI-20 revendiquait sans la démontrer. Elle est
    // ici PROUVÉE plutôt qu'affirmée : si l'un d'eux venait à en déclarer, son
    // score changerait au passage du correctif, et ce test le dirait d'abord.
    const aSubscore = Object.entries(QUESTIONNAIRE_CATALOGUE as Record<string, any>)
      .filter(([, def]) => def?.scoring?.type === 'subscore')
      .map(([id]) => id)
      .sort();
    expect(aSubscore.length, 'anti-vacuité : le catalogue en compte plusieurs').toBeGreaterThan(1);
    for (const id of aSubscore.filter(x => x !== 'Q_SOM_07')) {
      const sc = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id].scoring;
      for (const sub of sc.subScores ?? []) {
        expect(sub.reversed, `${id}/${sub.id}`).toBeUndefined();
      }
    }
  });
});
